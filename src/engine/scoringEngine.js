// ======================================
// SCORING ENGINE (V2 - Advanced Evaluation)
// ======================================

const { getIsConnected } = require("../db");
const truthEngine = require("./truthEngine");
let SessionScore;
try {
  SessionScore = require("../models/SessionScore");
} catch (e) {
  SessionScore = null;
}

// In-memory fallback if DB fails
const memScores = {};

/**
 * Helper to ensure a trade session score document exists
 */
async function getOrCreateSessionScore(userId, desk, sessionId) {
  if (!getIsConnected() || !SessionScore) return null;

  try {
    let scoreDoc = await SessionScore.findOne({ sessionId });
    if (!scoreDoc) {
      scoreDoc = await SessionScore.create({
        userId,
        desk,
        sessionId,
        sessionStart: new Date(),
        tradeScores: []
      });
    }
    return scoreDoc;
  } catch (err) {
    console.warn("Error fetching SessionScore:", err.message);
    return null;
  }
}

/**
 * Score the comment quality
 */
function scoreComment(comment, breakFields = []) {
  if (!comment) return { score: -2, reason: "No comment provided." };
  
  const text = comment.toLowerCase();
  let score = 0;
  let reason = "Standard comment.";

  if (text.length < 15 || text === "ok" || text === "done" || text === "test") {
    return { score: -2, reason: "Comment too short or generic." };
  }

  if (text.length > 30) {
    score += 1;
    reason = "Detailed comment.";
  }

  // Check if they mentioned the correct field
  if (breakFields.length > 0) {
    const mentionedField = breakFields.some(f => text.includes(f.toLowerCase()));
    if (mentionedField) {
      score += 2;
      reason = "Detailed comment correctly identifying the break field.";
    }
  }

  return { score, reason };
}

/**
 * Evaluate a single user action
 */
async function evaluateAction(trade, action, comment, userId, desk) {
  // Use trade.assignedTo as a proxy for sessionId if not provided explicitly, 
  // though typically we should use the Queue._id. We'll use userId + "_active" for now
  // if we don't have the explicit Queue ID here.
  const sessionId = `${userId}_active_${desk}`; 
  
  const scoreDoc = await getOrCreateSessionScore(userId, desk, sessionId);

  let pointsAwarded = 0;
  let penaltyApplied = 0;
  let verdict = "UNKNOWN";
  let reason = "";

  const moMismatches = truthEngine.getMismatchFields(trade, "mo");
  const confirmMismatches = truthEngine.getConfirmationMismatches(trade);

  switch (action) {
    case "MO_VALIDATE_PASS":
      if (moMismatches.length === 0) {
        pointsAwarded = 10;
        verdict = "CORRECT";
        reason = "Correctly validated a clean trade.";
      } else {
        penaltyApplied = 20;
        verdict = "FALSE_NEGATIVE";
        reason = `Missed MO breaks: ${moMismatches.join(", ")}`;
      }
      break;

    case "MO_RAISE_BREAK":
      if (moMismatches.length > 0) {
        pointsAwarded = 15;
        verdict = "CORRECT";
        reason = "Correctly identified MO break.";
      } else {
        penaltyApplied = 10;
        verdict = "FALSE_POSITIVE";
        reason = "Raised break on a clean trade.";
      }
      break;

    case "MO_SEND_TO_FO":
      if (moMismatches.length > 0) {
        pointsAwarded = 5;
        verdict = "CORRECT";
        reason = "Appropriate FO escalation for MO break.";
      } else {
        penaltyApplied = 5;
        verdict = "FALSE_POSITIVE";
        reason = "Escalated a clean trade to FO.";
      }
      break;

    case "CONFIRM_TRADE":
      if (confirmMismatches.length === 0) {
        pointsAwarded = 15;
        verdict = "CORRECT";
        reason = "Correctly confirmed clean trade terms.";
      } else {
        penaltyApplied = 25;
        verdict = "FALSE_NEGATIVE";
        const fields = confirmMismatches.map(m => m.field).join(", ");
        reason = `FATAL: Confirmed trade with unresolved CPTY breaks: ${fields}`;
      }
      break;

    case "CONFIRM_RAISE_BREAK":
      if (confirmMismatches.length > 0) {
        pointsAwarded = 10;
        verdict = "CORRECT";
        reason = "Correctly identified CPTY break.";
      } else {
        penaltyApplied = 10;
        verdict = "FALSE_POSITIVE";
        reason = "Raised break on trade matching CPTY expectations.";
      }
      break;

    case "CONFIRM_SEND_TO_CPTY":
      pointsAwarded = 5;
      verdict = "PROCEDURAL";
      reason = "Standard CPTY communication.";
      break;

    case "CONFIRM_ESCALATE_TO_FO":
      if (trade.cptyContactCount >= 1) {
        pointsAwarded = 10;
        verdict = "CORRECT";
        reason = "Proper FO escalation after CPTY contact.";
      } else {
        penaltyApplied = 10;
        verdict = "PROCEDURAL_VIOLATION";
        reason = "Escalated to FO before contacting CPTY.";
      }
      break;

    case "CONFIRM_REJECT_CLAIM":
      if (trade.foEscalation && trade.foEscalation.status === "FO_SUPPORTS_US") {
        pointsAwarded = 15;
        verdict = "CORRECT";
        reason = "Correctly rejected claim with FO backing.";
      } else {
        penaltyApplied = 15;
        verdict = "PROCEDURAL_VIOLATION";
        reason = "Rejected CPTY claim without FO verification.";
      }
      break;
      
    // Note: User explicitly requested to remove these 4 CONFIRM scenarios:
    // CONFIRM_REQUEST_EVIDENCE (WITH and WITHOUT), CONFIRM_APPROVE_AMENDMENT, CONFIRM_RESEND
  }

  const commentEval = scoreComment(comment, desk === "MO" ? moMismatches : confirmMismatches.map(m => m.field));
  if (commentEval.score > 0) pointsAwarded += commentEval.score;
  if (commentEval.score < 0) penaltyApplied += Math.abs(commentEval.score);

  if (scoreDoc) {
    let tradeScore = scoreDoc.tradeScores.find(ts => ts.tradeRef === trade.tradeRef);
    if (!tradeScore) {
      tradeScore = {
        tradeRef: trade.tradeRef,
        tradeType: (moMismatches.length > 0 || confirmMismatches.length > 0) ? "BREAK" : "CLEAN",
        breakFields: desk === "MO" ? moMismatches : confirmMismatches.map(m => m.field),
        actions: [],
        emails: [],
        timeSpentMs: 0,
        velocityMultiplier: 1.0,
        tradeSubtotal: 0
      };
      scoreDoc.tradeScores.push(tradeScore);
    }

    tradeScore.actions.push({
      action,
      timestamp: new Date(),
      pointsAwarded,
      penaltyApplied,
      verdict,
      reason: reason + " " + commentEval.reason,
      commentQuality: commentEval.score
    });

    tradeScore.tradeSubtotal += (pointsAwarded - penaltyApplied);
    scoreDoc.totalPoints += pointsAwarded;
    scoreDoc.totalPenalties += penaltyApplied;
    scoreDoc.finalScore = scoreDoc.totalPoints - scoreDoc.totalPenalties;

    // Categorization
    if (verdict === "CORRECT") scoreDoc.categories.accuracy += 5;
    if (verdict.includes("FALSE")) scoreDoc.categories.accuracy -= 5;
    if (verdict === "PROCEDURAL_VIOLATION") scoreDoc.categories.procedure -= 5;
    scoreDoc.categories.auditQuality += commentEval.score;

    await scoreDoc.save();
  }

  return { pointsAwarded, penaltyApplied, verdict };
}

/**
 * Evaluate an email using OpenRouter AI
 */
async function evaluateEmail(tradeRef, emailBody, recipient, trade, userId) {
  // Use trade.assignedTo as a proxy for sessionId
  const sessionId = trade.assignedTo ? `${trade.assignedTo}_active_${trade.nextDesk || 'MO'}` : `${userId}_active_MO`;
  const scoreDoc = await getOrCreateSessionScore(userId, trade.nextDesk || "MO", sessionId);

  if (!scoreDoc) return null;

  let tradeScore = scoreDoc.tradeScores.find(ts => ts.tradeRef === tradeRef);
  if (!tradeScore) {
    tradeScore = {
      tradeRef,
      tradeType: "UNKNOWN",
      breakFields: [],
      actions: [],
      emails: [],
      timeSpentMs: 0,
      velocityMultiplier: 1.0,
      tradeSubtotal: 0
    };
    scoreDoc.tradeScores.push(tradeScore);
  }

  let aiQualityScore = 5;
  let aiFeedback = "Message recorded.";
  let aiIssues = [];

  // Call OpenRouter API
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const actualMismatches = truthEngine.getMismatchFields(trade, "mo").join(", ") || 
                               truthEngine.getConfirmationMismatches(trade).map(m => m.field).join(", ") || "None";
      
      const prompt = `
        You are an expert financial operations evaluator. Evaluate this email sent by a junior analyst.
        Context:
        - Sent to: ${recipient}
        - Actual mismatches on this trade: ${actualMismatches}
        - Email body: "${emailBody.replace(/"/g, '\\"')}"
        
        Analyze the email for clarity, professionalism, and correctness (did they mention the actual mismatches?).
        Respond STRICTLY with a valid JSON object. Do not use markdown code blocks like \`\`\`json. Escape all double quotes inside the JSON values.
        {
          "qualityScore": <number 0-10>,
          "feedback": "<string: specific feedback on how to improve>",
          "issues": ["<string: VAGUE, UNPROFESSIONAL, WRONG_FIELD, etc.>"]
        }
      `;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b:free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "{}";
        // Attempt to parse JSON from content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            aiQualityScore = parsed.qualityScore !== undefined ? parsed.qualityScore : 5;
            aiFeedback = parsed.feedback || "Evaluated by AI.";
            aiIssues = parsed.issues || [];
          } catch (parseErr) {
            console.warn("JSON parse error from OpenRouter:", parseErr.message, "\\nRaw content:", jsonMatch[0]);
            aiFeedback = "Email received. (AI returned improperly formatted feedback, but your email was recorded).";
          }
        }
      } else {
        console.warn("OpenRouter API error:", response.status, await response.text());
      }
    } catch (err) {
      console.warn("Error calling OpenRouter API:", err.message);
    }
  }

  // Adjust score based on email quality
  let pointsAwarded = 0;
  let penaltyApplied = 0;
  if (aiQualityScore >= 8) pointsAwarded = 5;
  else if (aiQualityScore <= 4) penaltyApplied = 5;

  tradeScore.emails.push({
    direction: "SENT",
    recipient,
    body: emailBody,
    timestamp: new Date(),
    qualityScore: aiQualityScore,
    feedback: aiFeedback,
    issues: aiIssues
  });

  tradeScore.tradeSubtotal += (pointsAwarded - penaltyApplied);
  scoreDoc.totalPoints += pointsAwarded;
  scoreDoc.totalPenalties += penaltyApplied;
  scoreDoc.finalScore = scoreDoc.totalPoints - scoreDoc.totalPenalties;
  
  if (aiQualityScore >= 8) scoreDoc.categories.communication += 5;
  if (aiQualityScore <= 4) scoreDoc.categories.communication -= 5;

  await scoreDoc.save();

  return { qualityScore: aiQualityScore, feedback: aiFeedback };
}

/**
 * Finalize session and generate report
 */
async function generateReport(userId, sessionId) {
  if (!getIsConnected() || !SessionScore) return null;

  const scoreDoc = await SessionScore.findOne({ sessionId });
  if (!scoreDoc) return null;

  scoreDoc.sessionEnd = new Date();

  const strengths = [];
  const weaknesses = [];
  const improvements = [];

  let falseNegatives = 0;
  let falsePositives = 0;
  let proceduralViolations = 0;
  let avgEmailQuality = 0;
  let emailCount = 0;

  scoreDoc.tradeScores.forEach(ts => {
    ts.actions.forEach(a => {
      if (a.verdict === "FALSE_NEGATIVE") falseNegatives++;
      if (a.verdict === "FALSE_POSITIVE") falsePositives++;
      if (a.verdict === "PROCEDURAL_VIOLATION") proceduralViolations++;
    });
    ts.emails.forEach(e => {
      if (e.direction === "SENT") {
        avgEmailQuality += e.qualityScore;
        emailCount++;
      }
    });
  });

  if (emailCount > 0) avgEmailQuality /= emailCount;

  if (falseNegatives > 2) {
    weaknesses.push(`You missed ${falseNegatives} genuine breaks.`);
    improvements.push("Before clicking Validate/Confirm, always check all fields against the source of truth.");
  } else if (falseNegatives === 0) {
    strengths.push("Excellent break detection accuracy. You missed no breaks.");
  }

  if (falsePositives > 2) {
    weaknesses.push(`You raised ${falsePositives} false breaks on clean trades.`);
    improvements.push("Only raise a break when you can identify a specific field mismatch.");
  }

  if (proceduralViolations > 0) {
    weaknesses.push(`You committed ${proceduralViolations} procedural violations.`);
    improvements.push("Always follow the hierarchy: CPTY first → FO only if CPTY disputes. Never reject without FO backing.");
  } else {
    strengths.push("Perfect adherence to escalation procedures.");
  }

  if (emailCount > 0) {
    if (avgEmailQuality < 5) {
      weaknesses.push("Your email communication quality is below expectations.");
      improvements.push("Structure emails with: 1) Trade Ref 2) Specific issue 3) Clear ask.");
    } else if (avgEmailQuality >= 8) {
      strengths.push("Excellent communication skills — your emails were clear and professional.");
    }
  }

  // Grade
  const possiblePoints = Math.max(1, scoreDoc.totalPoints + scoreDoc.totalPenalties); // simplistic
  const pct = (scoreDoc.totalPoints / possiblePoints) * 100;
  let grade = "C";
  if (pct >= 90) grade = "A+";
  else if (pct >= 80) grade = "A";
  else if (pct >= 70) grade = "B+";
  else if (pct >= 60) grade = "B";
  else if (pct < 50) grade = "D";

  scoreDoc.grade = grade;
  scoreDoc.feedback = {
    strengths,
    weaknesses,
    improvements,
    summary: `You scored ${scoreDoc.finalScore} points with a grade of ${grade}.`
  };

  await scoreDoc.save();
  return scoreDoc;
}

module.exports = {
  evaluateAction,
  evaluateEmail,
  generateReport
};