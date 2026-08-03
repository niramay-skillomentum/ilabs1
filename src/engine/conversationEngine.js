// ======================================
// CONVERSATION ENGINE (MONGODB)
// ======================================

const Conversation = require("../models/Conversation");
const Trade = require("../models/Trade");
const { getIo } = require("./socketEngine");
const sanitizeHtml = require("sanitize-html");
const BoundedCache = require("./boundedCache");

// In-memory cache for fast access during active sessions.
// Bounded LRU + TTL so it can't grow for the life of the process (previously a
// plain {} that retained every trade's messages forever → guaranteed OOM).
const CACHE_MAX = parseInt(process.env.CONVO_CACHE_MAX, 10) || 5000;
const CACHE_TTL_MS = parseInt(process.env.CONVO_CACHE_TTL_MS, 10) || 5 * 60_000;
const cache = new BoundedCache({ max: CACHE_MAX, ttl: CACHE_TTL_MS });

// Cap the embedded messages array so a long-running (or looping) bot
// conversation can't grow a single document toward Mongo's 16MB ceiling and
// bloat every read of that trade. Keeps the most recent N messages.
const MAX_MESSAGES = parseInt(process.env.CONVO_MAX_MESSAGES, 10) || 200;

/**
 * Create or add message to conversation
 */
async function createMessage(tradeRef, sender, body, subject, desk, skipEmit = false) {

  // KI-017: Sanitize body to prevent XSS
  const sanitizedBody = sanitizeHtml(body, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'span', 'div' ]),
    allowedAttributes: {
      '*': ['style', 'class', 'id'], // Need style for UI components like attachments
      'a': ['href', 'name', 'target'],
      'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading']
    }
  });

  const updateDoc = {
    $setOnInsert: { tradeRef, status: "OPEN" },
    $push: {
      messages: {
        $each: [{
          sender,
          body: sanitizedBody,
          subject: subject || `Trade ${tradeRef}`,
          timestamp: new Date()
        }],
        $slice: -MAX_MESSAGES   // retain only the most recent N
      }
    }
  };

  if (desk) {
    updateDoc.$addToSet = { desks: desk };
  }

  // Update MongoDB
  const conversation = await Conversation.findOneAndUpdate(
    { tradeRef },
    updateDoc,
    { upsert: true, returnDocument: 'after' }
  );

  // Update cache
  cache.set(tradeRef, {
    subject: subject || conversation.messages[0]?.subject || `Trade ${tradeRef}`,
    status: conversation.status,
    messages: conversation.messages.map(m => ({
      sender: m.sender,
      body: m.body,
      subject: m.subject,
      timestamp: m.timestamp
    }))
  });

  const cached = cache.get(tradeRef);

  if (!skipEmit) {
    try {
      const io = getIo();
      if (io) {
        // (B4) Scope to the trade owner's room; broadcast only if unknown.
        const ownerDoc = await Trade.findOne({ tradeRef }).select("assignedTo").lean();
        const owner = ownerDoc?.assignedTo;
        const payload = {
          tradeRef,
          sender,
          subject: subject || `Trade ${tradeRef}`,
          timestamp: new Date()
        };
        if (owner) io.to(`user_${owner}`).emit("new_email", payload);
        else io.emit("new_email", payload);
      }
    } catch (err) {
      console.log("Socket emit failed", err.message);
    }
  }

  return cached;
}


/**
 * Get full conversation
 */
async function getConversation(tradeRef) {

  // Fetch from DB (bypassing local memory cache for distributed worker compatibility)
  const doc = await Conversation.findOne({ tradeRef }).lean();

  if (!doc) {
    return {
      subject: `Trade ${tradeRef}`,
      messages: []
    };
  }

  const result = {
    subject: doc.messages[0]?.subject || `Trade ${tradeRef}`,
    status: doc.status,
    messages: doc.messages.map(m => ({
      sender: m.sender,
      body: m.body,
      subject: m.subject,
      timestamp: m.timestamp
    }))
  };

  return result;
}


/**
 * Get conversations, most-recent first.
 * Bounded + paginated — never loads the entire collection (with every message
 * of every trade) into memory at once, which would OOM at scale.
 *
 * @param {{ limit?: number, skip?: number }} opts
 */
async function getAllConversations({ limit = 200, skip = 0 } = {}) {
  const cappedLimit = Math.min(Math.max(limit, 1), 500);

  const docs = await Conversation.find({})
    .sort({ updatedAt: -1 })
    .skip(Math.max(skip, 0))
    .limit(cappedLimit)
    .lean();

  const result = {};

  docs.forEach(doc => {
    result[doc.tradeRef] = {
      subject: doc.messages[0]?.subject || `Trade ${doc.tradeRef}`,
      status: doc.status,
      messages: doc.messages.map(m => ({
        sender: m.sender,
        body: m.body,
        subject: m.subject,
        timestamp: m.timestamp
      }))
    };
  });

  return result;
}


/**
 * Resolve a conversation
 */
async function resolveConversation(tradeRef) {
  await Conversation.findOneAndUpdate(
    { tradeRef },
    { status: "RESOLVED" }
  );

  const cachedConvo = cache.get(tradeRef);
  if (cachedConvo) {
    cachedConvo.status = "RESOLVED";
    cache.set(tradeRef, cachedConvo);
  }
}

module.exports = {
  createMessage,
  getConversation,
  getAllConversations,
  resolveConversation
};