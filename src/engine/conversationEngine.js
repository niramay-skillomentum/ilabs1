// ======================================
// CONVERSATION ENGINE (MONGODB)
// ======================================

const Conversation = require("../models/Conversation");
const Trade = require("../models/Trade");
const { getIo } = require("./socketEngine");
const sanitizeHtml = require("sanitize-html");

// In-memory cache for fast access during active sessions
const cache = {};

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
        sender,
        body: sanitizedBody,
        subject: subject || `Trade ${tradeRef}`,
        timestamp: new Date()
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
  cache[tradeRef] = {
    subject: subject || conversation.messages[0]?.subject || `Trade ${tradeRef}`,
    status: conversation.status,
    messages: conversation.messages.map(m => ({
      sender: m.sender,
      body: m.body,
      subject: m.subject,
      timestamp: m.timestamp
    }))
  };

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

  return cache[tradeRef];
}


/**
 * Get full conversation
 */
async function getConversation(tradeRef) {

  // Check cache first
  if (cache[tradeRef]) {
    return cache[tradeRef];
  }

  // Fetch from DB
  const doc = await Conversation.findOne({ tradeRef });

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

  cache[tradeRef] = result;
  return result;
}


/**
 * Get all conversations (for filtering by server)
 */
async function getAllConversations() {

  const docs = await Conversation.find({});
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

  if (cache[tradeRef]) {
    cache[tradeRef].status = "RESOLVED";
  }
}

module.exports = {
  createMessage,
  getConversation,
  getAllConversations,
  resolveConversation
};