// ======================================
// REPORT GENERATOR
// Orchestrates the entire OPI analysis pipeline
// and makes the single AI call for narrative synthesis.
//
// Pipeline:
//   1. Fetch all PerformanceEvents for the session
//   2. Fetch all trades
//   3. Run workflowAnalyzer → per-trade workflow analysis
//   4. Run decisionAnalyzer → per-trade decision analysis
//   5. Run timelineAnalyzer → session timeline
//   6. Run mailAnalyzer → per-email evaluations
//   7. Run competencyEngine → 10 competency scores
//   8. Run benchmarkEngine → benchmarks & percentiles
//   9. Run recommendationEngine → deterministic recommendations
//   10. Build evidenceGraph → back every finding
//   11. Compress evidence into structured JSON (<4000 tokens)
//   12. Single Nemotron Ultra call → narrative synthesis
//   13. Assemble final report → persist to PerformanceReport
//   14. Update CompetencyProfile and LearningProfile
// ======================================

const { v4: uuidv4 } = require("uuid");
const { getIsConnected } = require("../../db");

// OPI Engines
const sessionCollector = require("./sessionCollector");
const workflowAnalyzer = require("./workflowAnalyzer");
const decisionAnalyzer = require("./decisionAnalyzer");
const timelineAnalyzer = require("./timelineAnalyzer");
const competencyEngine = require("./competencyEngine");
const mailAnalyzer = require("./mailAnalyzer");
const benchmarkEngine = require("./benchmarkEngine");
const recommendationEngine = require("./recommendationEngine");
const evidenceGraph = require("./evidenceGraph");

// Models
let PerformanceSession, PerformanceEvent, PerformanceReport, LearningProfile, Trade, LearningEvent;
try {
  PerformanceSession = require("../../models/PerformanceSession");
  PerformanceEvent = require("../../models/PerformanceEvent");
  PerformanceReport = require("../../models/PerformanceReport");
  LearningProfile = require("../../models/LearningProfile");
  Trade = require("../../models/Trade");
  LearningEvent = require("../../models/LearningEvent");
} catch (e) {
  console.warn("[OPI] Some models not available:", e.message);
}

// OpenRouter configuration (matches existing tutorAI pattern)
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free"
];

const AI_TIMEOUT_MS = 120000; // 120-second timeout for the large model

/**
 * Generate a complete performance report for a session.
 *
 * @param {string} sessionId - The performance session ID
 * @returns {Object} The generated report
 */
async function generateReport(sessionId) {
  const startTime = Date.now();
  console.log(`[OPI] Starting report generation for session: ${sessionId}`);

  // ── Step 1: Fetch session and events ──
  const session = await PerformanceSession.findOne({ sessionId }).lean();
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const events = await PerformanceEvent.find({ sessionId }).sort({ timestamp: 1 }).lean();
  if (events.length === 0) {
    console.warn(`[OPI] No events found for session ${sessionId}`);
  }

  // ── Step 2: Fetch all trades ──
  const trades = await Trade.find({ tradeRef: { $in: session.tradeRefs } }).lean();

  // ── Step 3: Group events by trade ──
  const tradeEventsMap = new Map();
  for (const event of events) {
    if (event.tradeRef) {
      if (!tradeEventsMap.has(event.tradeRef)) {
        tradeEventsMap.set(event.tradeRef, []);
      }
      tradeEventsMap.get(event.tradeRef).push(event);
    }
  }

  // ── Step 4: Run Workflow Analyzer ──
  console.log("[OPI] Running workflow analysis...");
  const workflowAnalysis = workflowAnalyzer.analyzeSession(trades, tradeEventsMap, session.desk);

  // ── Step 5: Run Decision Analyzer ──
  console.log("[OPI] Running decision analysis...");
  const allDecisions = [];
  for (const trade of trades) {
    const tradeEvents = tradeEventsMap.get(trade.tradeRef) || [];
    const decisions = decisionAnalyzer.analyzeTradeDecisions(trade, tradeEvents, session.desk);
    allDecisions.push(...decisions);
  }
  const decisionAnalysis = decisionAnalyzer.aggregateDecisions(allDecisions);

  // ── Step 6: Run Timeline Analyzer ──
  console.log("[OPI] Building timeline...");
  const timeline = timelineAnalyzer.buildTimeline(events);

  // ── Step 7: Run Mail Analyzer ──
  console.log("[OPI] Analyzing emails...");
  const mailEvents = events.filter(e => e.eventType === "MAIL_SENT");
  const mailEvaluations = mailAnalyzer.evaluateSessionEmails(mailEvents, sessionId);
  const mailAnalysisAgg = mailAnalyzer.aggregateMailAnalysis(mailEvaluations);

  // ── Step 8: Identify Repeated Mistakes ──
  console.log("[OPI] Identifying repeated mistakes...");
  const repeatedMistakes = await identifyRepeatedMistakes(session.userId, sessionId, events);

  // ── Step 9: Run Competency Engine ──
  console.log("[OPI] Calculating competencies...");
  const learningEvents = events.filter(e => e.eventType === "LEARNING_EVENT");
  const competencyScores = competencyEngine.calculateCompetencies({
    workflowAnalysis,
    decisionAnalysis,
    timelineAnalysis: timeline,
    mailEvaluations,
    learningEvents,
    desk: session.desk,
    trades
  });

  // ── Step 10: Run Benchmark Engine ──
  console.log("[OPI] Computing benchmarks...");
  const completionRate = trades.length > 0
    ? Math.round((trades.filter(t => isTradeCompleted(t, session.desk)).length / trades.length) * 100)
    : 0;

  const benchmarkComparison = benchmarkEngine.compareToBenchmarks({
    desk: session.desk,
    avgTimePerTrade: timeline.avgTimePerTrade || 0,
    decisionAccuracy: decisionAnalysis.accuracy,
    workflowCompliance: workflowAnalysis.overallCompliance,
    communicationScore: mailAnalysisAgg.avgScore,
    completionRate
  });

  const peerPercentile = await benchmarkEngine.calculatePeerPercentile(
    session.userId, competencyScores
  );

  // ── Step 11: Run Recommendation Engine ──
  console.log("[OPI] Generating recommendations...");
  const recommendations = recommendationEngine.generateRecommendations({
    workflowAnalysis,
    decisionAnalysis,
    competencyScores,
    mailAnalysis: mailAnalysisAgg,
    timelineAnalysis: timeline,
    repeatedMistakes,
    benchmarkComparison
  });

  const readiness = recommendationEngine.assessReadiness(competencyScores, decisionAnalysis);

  // ── Step 12: Build Evidence Graph ──
  console.log("[OPI] Building evidence graph...");
  const evidenceGraphData = evidenceGraph.buildEvidenceGraph({
    workflowAnalysis,
    decisionAnalysis,
    mailEvaluations,
    repeatedMistakes,
    competencyScores,
    timelineAnalysis: timeline
  });

  // ── Step 13: Build per-trade analysis ──
  const tradeAnalyses = buildTradeAnalyses(trades, workflowAnalysis, allDecisions, mailEvaluations, session.desk);

  // ── Step 14: Session KPIs ──
  const sessionKPIs = {
    totalTrades: trades.length,
    tradesCompleted: trades.filter(t => isTradeCompleted(t, session.desk)).length,
    cleanTrades: trades.filter(t => !workflowAnalyzer.determineIsBreak(t, session.desk)).length,
    breakTrades: trades.filter(t => workflowAnalyzer.determineIsBreak(t, session.desk)).length,
    correctDecisions: decisionAnalysis.correctDecisions,
    incorrectDecisions: decisionAnalysis.incorrectDecisions,
    decisionAccuracy: decisionAnalysis.accuracy,
    avgWorkflowCompliance: workflowAnalysis.overallCompliance,
    avgTimePerTrade: timeline.avgTimePerTrade,
    totalSessionTime: Math.round((timeline.totalDuration || 0) / 1000),
    criticalErrors: decisionAnalysis.highRiskErrors,
    emailsSent: mailEvaluations.length,
    avgMailScore: mailAnalysisAgg.avgScore
  };

  // ── Step 15: AI Narrative Synthesis ──
  console.log("[OPI] Generating AI narrative (single call)...");
  let aiSections = {
    executiveSummary: "",
    tradeCoaching: [],
    communicationCoaching: "",
    improvementPlan: "",
    mentorSummary: "",
    managerSummary: ""
  };
  let aiTokensUsed = 0;

  try {
    const aiResult = await generateAINarrative({
      sessionKPIs,
      competencyScores,
      decisionAnalysis,
      workflowAnalysis,
      mailAnalysisAgg,
      repeatedMistakes,
      recommendations,
      readiness,
      tradeAnalyses,
      evidenceGraphData,
      desk: session.desk
    });
    if (aiResult) {
      aiSections = aiResult.sections;
      aiTokensUsed = aiResult.tokensUsed || 0;
    }
  } catch (err) {
    console.warn("[OPI] AI narrative generation failed:", err.message);
    aiSections.executiveSummary = generateFallbackSummary(sessionKPIs, competencyScores, readiness);
  }

  // ── Step 16: Assemble and persist report ──
  const reportId = uuidv4();
  const generationTimeMs = Date.now() - startTime;

  const report = {
    reportId,
    sessionId,
    userId: session.userId,
    desk: session.desk,
    generatedAt: new Date(),

    sessionKPIs,
    tradeAnalyses,
    workflowCompliance: {
      overallCompliance: workflowAnalysis.overallCompliance,
      totalStepsExpected: workflowAnalysis.totalStepsExpected,
      totalStepsCompleted: workflowAnalysis.totalStepsCompleted,
      totalStepsSkipped: workflowAnalysis.totalStepsSkipped,
      totalUnnecessarySteps: workflowAnalysis.totalUnnecessarySteps
    },
    decisionAnalysis: {
      totalDecisions: decisionAnalysis.totalDecisions,
      correctDecisions: decisionAnalysis.correctDecisions,
      incorrectDecisions: decisionAnalysis.incorrectDecisions,
      accuracy: decisionAnalysis.accuracy,
      highRiskErrors: decisionAnalysis.highRiskErrors,
      decisions: decisionAnalysis.decisions
    },
    competencyScores,
    timeline: timeline.entries,
    repeatedMistakes,
    mailEvaluations: mailEvaluations.map(e => ({
      tradeRef: e.tradeRef,
      ruleResults: e.ruleResults,
      ruleScore: e.ruleScore,
      overallScore: e.overallScore
    })),
    evidenceGraph: evidenceGraphData,
    benchmarks: {
      avgTimePerTradeBenchmark: benchmarkEngine.getTimeBenchmarks(session.desk).target,
      peerPercentile: peerPercentile.overallPercentile,
      competencyPercentiles: peerPercentile.competencyPercentiles
    },
    recommendations,

    // AI sections
    executiveSummary: aiSections.executiveSummary,
    tradeCoaching: aiSections.tradeCoaching,
    communicationCoaching: aiSections.communicationCoaching,
    improvementPlan: aiSections.improvementPlan,
    mentorSummary: aiSections.mentorSummary,
    managerSummary: aiSections.managerSummary,

    aiTokensUsed,
    generationTimeMs
  };

  // Persist report
  if (getIsConnected() && PerformanceReport) {
    try {
      await PerformanceReport.create(report);
      console.log(`[OPI] Report persisted: ${reportId} (${generationTimeMs}ms, ${aiTokensUsed} AI tokens)`);
    } catch (err) {
      console.warn("[OPI] Report persist failed:", err.message);
    }
  }

  // Update session
  if (PerformanceSession) {
    await PerformanceSession.updateOne(
      { sessionId },
      { $set: { reportGenerated: true, reportId, status: "COMPLETED" } }
    ).catch(() => {});
  }

  // ── Step 17: Update CompetencyProfile and LearningProfile ──
  await competencyEngine.updateProfile(session.userId, competencyScores, sessionId, session.desk);
  await updateLearningProfile(session.userId, sessionId, session.desk, sessionKPIs, competencyScores, repeatedMistakes);

  console.log(`[OPI] Report generation complete: ${reportId} in ${generationTimeMs}ms`);
  return report;
}

// ======================================
// AI NARRATIVE SYNTHESIS
// Single structured call to Nemotron Ultra
// ======================================

async function generateAINarrative({
  sessionKPIs, competencyScores, decisionAnalysis,
  workflowAnalysis, mailAnalysisAgg, repeatedMistakes,
  recommendations, readiness, tradeAnalyses, evidenceGraphData, desk
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[OPI] No OPENROUTER_API_KEY — skipping AI narrative");
    return null;
  }

  // Compress evidence into a token-efficient package
  const evidencePackage = {
    desk,
    kpis: sessionKPIs,
    competencies: competencyScores,
    readiness: readiness.label,
    decisionAccuracy: decisionAnalysis.accuracy + "%",
    criticalErrors: decisionAnalysis.highRiskErrors,
    workflowCompliance: workflowAnalysis.overallCompliance + "%",
    emailQuality: mailAnalysisAgg.avgScore + "%",
    emailsAnalyzed: mailAnalysisAgg.totalEmails,
    repeatedMistakes: (repeatedMistakes || []).map(m => `${m.title} (${m.count}x)`),
    keyFindings: evidenceGraphData.slice(0, 5).map(e => e.finding),
    recommendations: recommendations.slice(0, 5),
    tradeHighlights: tradeAnalyses.slice(0, 5).map(t => ({
      ref: t.tradeRef,
      compliance: t.workflowCompliance + "%",
      correctDecisions: t.decisions?.filter(d => d.isCorrect).length || 0,
      totalDecisions: t.decisions?.length || 0,
      scenario: t.scenario
    }))
  };

  const systemPrompt = `You are a VP in Global Investment Banking Operations.
You are reviewing a post-session performance report for an analyst training on the ${desk} desk in an operations simulator.

CRITICAL RULES:
1. DO NOT determine any facts. All facts are provided as verified evidence.
2. Your job is ONLY to explain the evidence in a coaching, professional tone.
3. Be specific — reference trade references, competency scores, and findings.
4. Be encouraging but honest about areas needing improvement.
5. Keep the tone professional and constructive.

Respond with VALID JSON only. No markdown, no code blocks.`;

  const userPrompt = `Here is the verified evidence package:

${JSON.stringify(evidencePackage, null, 2)}

Generate a JSON object with these keys:
{
  "executiveSummary": "200-word summary of the session performance",
  "tradeCoaching": [{"tradeRef": "...", "coaching": "50-word coaching per trade"}],
  "communicationCoaching": "150-word communication improvement advice",
  "improvementPlan": "200-word structured improvement plan",
  "mentorSummary": "100-word mentor briefing",
  "managerSummary": "100-word manager briefing with readiness assessment"
}

Limit total response to 1000 words. Reference specific evidence.`;

  for (const model of FREE_MODELS) {
    try {
      console.log(`[OPI] Trying AI model: ${model}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "iLabs OPI Report Generator"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 3000
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[OPI] Model ${model} failed: ${response.status}`, errorText);
        if (response.status === 429) continue;
        throw new Error(`OpenRouter ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn(`[OPI] Model ${model} returned empty content`);
        continue;
      }

      // Parse JSON from response (handle potential code block wrapping)
      let parsed;
      try {
        const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn("[OPI] Failed to parse AI response as JSON:", parseErr.message);
        // Fallback: use raw content as executive summary
        parsed = { executiveSummary: content.substring(0, 1000) };
      }

      console.log(`[OPI] AI narrative generated successfully via ${model}`);
      return {
        sections: {
          executiveSummary: parsed.executiveSummary || "",
          tradeCoaching: Array.isArray(parsed.tradeCoaching) ? parsed.tradeCoaching : [],
          communicationCoaching: parsed.communicationCoaching || "",
          improvementPlan: parsed.improvementPlan || "",
          mentorSummary: parsed.mentorSummary || "",
          managerSummary: parsed.managerSummary || ""
        },
        tokensUsed: data.usage?.total_tokens || 0
      };

    } catch (err) {
      if (err.name === "AbortError") {
        console.warn(`[OPI] Model ${model} timed out after ${AI_TIMEOUT_MS}ms, trying next...`);
        continue;
      }
      if (err.message.includes("429")) continue;
      console.warn(`[OPI] AI model ${model} error:`, err.message);
      continue;
    }
  }

  console.warn("[OPI] All AI models failed or rate-limited");
  return null;
}

// ======================================
// HELPER FUNCTIONS
// ======================================

/**
 * Determine if a trade was successfully completed by the user based on their desk.
 */
function isTradeCompleted(trade, desk) {
  if (["SETTLED", "CLOSED", "RECON_CLEARED"].includes(trade.currentStatus)) return true;
  
  if (desk === "MO") {
    if (["CONFIRMATION_PENDING", "SETTLEMENT_PENDING"].includes(trade.currentStatus)) return true;
    if (trade.currentStatus === "PENDING_FO_RESPONSE" && !trade.foResponseReceived) return true;
    return false;
  }
  
  if (desk === "CONFIRMATION") {
    if (["SETTLEMENT_PENDING", "LIASING_WITH_FO"].includes(trade.currentStatus)) return true;
    return false;
  }
  
  return false;
}

/**
 * Build per-trade analysis objects for the report.
 */
function buildTradeAnalyses(trades, workflowAnalysis, allDecisions, mailEvaluations, desk) {
  return trades.map(trade => {
    const wfResult = workflowAnalysis.tradeResults?.find(r => r.tradeRef === trade.tradeRef) || {};
    const tradeDecisions = allDecisions.filter(d => d.tradeRef === trade.tradeRef);
    const tradeMails = mailEvaluations.filter(e => e.tradeRef === trade.tradeRef);
    const avgMailScore = tradeMails.length > 0
      ? Math.round(tradeMails.reduce((s, m) => s + m.ruleScore, 0) / tradeMails.length)
      : null;

    // Build expected vs actual action comparison table
    const actionComparison = buildActionComparison(wfResult);

    // Calculate overall trade rating (1–5)
    const rating = calculateTradeRating(wfResult, tradeDecisions, avgMailScore);

    // Determine scenario type
    const scenario = determineScenario(trade, desk);

    return {
      tradeRef: trade.tradeRef,
      desk,
      scenario,
      difficulty: trade.age >= 2 ? "Advanced" : trade.age >= 1 ? "Intermediate" : "Standard",
      direction: trade.direction || "BUY",
      settlementType: trade.settlementType || "ELECTRONIC",
      expectedWorkflow: wfResult.expectedWorkflow || [],
      actualWorkflow: wfResult.actualWorkflow || [],
      skippedSteps: wfResult.skippedSteps || [],
      unnecessarySteps: wfResult.unnecessarySteps || [],
      workflowCompliance: wfResult.compliancePercent || 0,
      decisions: tradeDecisions,
      actionComparison,
      mailScore: avgMailScore,
      mailDetails: tradeMails.length > 0 ? tradeMails : null,
      operationalImpact: wfResult.operationalImpact || "None",
      aiCoaching: "",  // Filled by AI synthesis
      overallRating: rating
    };
  });
}

/**
 * Build the expected vs actual action comparison table.
 */
function buildActionComparison(wfResult) {
  if (!wfResult.expectedWorkflow) return [];

  // Clone actualWorkflow so we can consume matched items
  const actualRemaining = [...(wfResult.actualWorkflow || [])];

  return wfResult.expectedWorkflow.map(step => {
    const foundIdx = actualRemaining.indexOf(step);
    const performed = foundIdx !== -1;
    if (performed) {
       actualRemaining.splice(foundIdx, 1);
    }
    return {
      expectedAction: step,
      userPerformed: performed,
      isCorrect: performed,
      reason: performed ? "Completed" : "Skipped"
    };
  });
}

/**
 * Calculate an overall trade rating from 1–5.
 */
function calculateTradeRating(wfResult, decisions, mailScore) {
  let score = 0;
  let factors = 0;

  // Workflow compliance (40% weight)
  if (wfResult.compliancePercent !== undefined) {
    score += (wfResult.compliancePercent / 100) * 5 * 0.4;
    factors += 0.4;
  }

  // Decision accuracy (40% weight)
  if (decisions.length > 0) {
    const correct = decisions.filter(d => d.isCorrect).length;
    score += (correct / decisions.length) * 5 * 0.4;
    factors += 0.4;
  }

  // Mail score (20% weight)
  if (mailScore !== null && mailScore !== undefined) {
    score += (mailScore / 100) * 5 * 0.2;
    factors += 0.2;
  }

  return factors > 0 ? Math.round((score / factors) * 10) / 10 : 3;
}

/**
 * Determine the scenario type for a trade.
 */
function determineScenario(trade, desk) {
  if (trade.cutoffMissedReason) return "CUTOFF_BREAK";

  try {
    const { determineIsBreak } = require("./workflowAnalyzer");
    const isBreak = determineIsBreak(trade, desk, true);
    
    if (!isBreak) return "CLEAN";

    // If it's a break, identify the exact mismatch type using the reverted trade
    let tradeToEvaluate = JSON.parse(JSON.stringify(trade));
    if (tradeToEvaluate.amendmentHistory && tradeToEvaluate.amendmentHistory.length > 0) {
      const history = [...tradeToEvaluate.amendmentHistory].reverse();
      for (const am of history) {
        if (!am.desk || am.desk.toUpperCase() === desk.toUpperCase()) {
          if (tradeToEvaluate.booking && am.field) tradeToEvaluate.booking[am.field] = am.oldValue;
          if (tradeToEvaluate[am.field] !== undefined) tradeToEvaluate[am.field] = am.oldValue;
        }
      }
    }

    const truthEngine = require("../truthEngine");
    if (desk === "MO") {
      const mismatches = truthEngine.getMismatchFields(tradeToEvaluate, "mo");
      if (mismatches.includes("amount")) return "AMOUNT_MISMATCH";
      if (mismatches.includes("valueDate")) return "VALUE_DATE_MISMATCH";
      if (mismatches.includes("currency")) return "CURRENCY_MISMATCH";
      if (mismatches.includes("counterparty")) return "COUNTERPARTY_MISMATCH";
      return "BREAK";
    }
    if (desk === "CONFIRMATION") {
      const mismatches = truthEngine.getConfirmationMismatches(tradeToEvaluate);
      return mismatches[0]?.field?.toUpperCase() + "_MISMATCH" || "BREAK";
    }
    if (desk === "SETTLEMENT") {
      return "SSI_MISMATCH";
    }
  } catch (e) {}

  return "UNKNOWN";
}

/**
 * Identify repeated mistakes from learning events.
 */
async function identifyRepeatedMistakes(userId, sessionId, events) {
  const mistakeCounts = {};

  // From session events
  const learningEvents = events.filter(e => e.eventType === "LEARNING_EVENT");
  for (const event of learningEvents) {
    const code = event.metadata?.mistakeCode;
    if (code) {
      if (!mistakeCounts[code]) {
        mistakeCounts[code] = {
          mistakeCode: code,
          title: event.metadata.title || code,
          severity: event.metadata.severity || "WARNING",
          count: 0,
          trades: []
        };
      }
      mistakeCounts[code].count++;
      if (event.tradeRef && !mistakeCounts[code].trades.includes(event.tradeRef)) {
        mistakeCounts[code].trades.push(event.tradeRef);
      }
    }
  }

  // Also check historical learning events for cross-session repeats
  if (getIsConnected() && LearningEvent) {
    try {
      const historical = await LearningEvent.aggregate([
        { $match: { userId, repeatCount: { $gte: 2 } } },
        { $group: { _id: "$mistakeCode", count: { $sum: 1 }, title: { $first: "$title" }, severity: { $first: "$severity" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      for (const h of historical) {
        if (!mistakeCounts[h._id]) {
          mistakeCounts[h._id] = {
            mistakeCode: h._id,
            title: h.title || h._id,
            severity: h.severity || "WARNING",
            count: h.count,
            trades: []
          };
        }
      }
    } catch (err) {
      // Non-critical — continue without historical data
    }
  }

  return Object.values(mistakeCounts).sort((a, b) => b.count - a.count);
}

/**
 * Update the persistent LearningProfile.
 */
async function updateLearningProfile(userId, sessionId, desk, sessionKPIs, competencyScores, repeatedMistakes) {
  if (!getIsConnected() || !LearningProfile) return;

  try {
    const sessionEntry = {
      sessionId,
      desk,
      date: new Date(),
      overallScore: competencyEngine.calculateOverallReadiness(competencyScores),
      criticalErrors: sessionKPIs.criticalErrors,
      decisionAccuracy: sessionKPIs.decisionAccuracy,
      workflowCompliance: sessionKPIs.avgWorkflowCompliance,
      communicationScore: sessionKPIs.avgMailScore
    };

    // Determine weak areas and strengths
    const weakAreas = Object.entries(competencyScores)
      .filter(([_, score]) => typeof score === "number" && score > 0 && score < 70)
      .map(([key]) => key);
    const strengths = Object.entries(competencyScores)
      .filter(([_, score]) => typeof score === "number" && score > 85)
      .map(([key]) => key);

    // Determine improvement trend from last 5 sessions
    const existing = await LearningProfile.findOne({ userId }).lean();
    let trend = "INSUFFICIENT_DATA";
    if (existing && existing.sessions && existing.sessions.length >= 4) {
      const recentScores = existing.sessions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4)
        .map(s => s.overallScore);
      recentScores.unshift(sessionEntry.overallScore);

      const avg1 = (recentScores[0] + recentScores[1]) / 2; // Recent
      const avg2 = (recentScores[3] + recentScores[4]) / 2; // Older
      if (avg1 > avg2 + 5) trend = "IMPROVING";
      else if (avg1 < avg2 - 5) trend = "DECLINING";
      else trend = "STABLE";
    }

    await LearningProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          lastUpdated: new Date(),
          weakAreas,
          strengths,
          improvementTrend: trend,
          repeatedMistakeCodes: (repeatedMistakes || []).map(m => ({
            code: m.mistakeCode,
            title: m.title,
            count: m.count,
            lastOccurred: new Date()
          }))
        },
        $inc: { totalSessions: 1 },
        $push: {
          sessions: {
            $each: [sessionEntry],
            $slice: -50,       // Keep last 50 sessions
            $position: 0       // Most recent first
          }
        }
      },
      { upsert: true }
    );

    console.log(`[OPI] LearningProfile updated for ${userId} (trend: ${trend})`);
  } catch (err) {
    console.warn("[OPI] LearningProfile update failed:", err.message);
  }
}

/**
 * Generate a fallback summary when AI is unavailable.
 */
function generateFallbackSummary(kpis, competencies, readiness) {
  return `Session completed with ${kpis.tradesCompleted}/${kpis.totalTrades} trades processed. ` +
    `Decision accuracy: ${kpis.decisionAccuracy}%. Workflow compliance: ${kpis.avgWorkflowCompliance}%. ` +
    `${kpis.criticalErrors > 0 ? `${kpis.criticalErrors} critical error(s) detected. ` : ""}` +
    `Overall readiness assessment: ${readiness.label}.`;
}

module.exports = {
  generateReport
};
