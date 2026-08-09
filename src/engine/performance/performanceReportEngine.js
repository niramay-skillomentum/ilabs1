// ======================================
// PERFORMANCE REPORT ENGINE
// Top-level orchestrator for the OPI platform.
// Provides the public API for report generation,
// retrieval, and view filtering.
//
// Three report views from the same data:
//   Student Report — full detail
//   Mentor Report — coaching focus
//   Manager Report — operational readiness
// ======================================

const { getIsConnected } = require("../../db");
const reportGenerator = require("./reportGenerator");

let PerformanceReport, PerformanceSession, CompetencyProfile, LearningProfile;
try {
  PerformanceReport = require("../../models/PerformanceReport");
  PerformanceSession = require("../../models/PerformanceSession");
  CompetencyProfile = require("../../models/CompetencyProfile");
  LearningProfile = require("../../models/LearningProfile");
} catch (e) {
  console.warn("[OPI] Some models not available");
}

/**
 * Generate a report for a session.
 * Option C: Can be triggered manually or automatically.
 */
async function generateReport(sessionId) {
  return await reportGenerator.generateReport(sessionId);
}

/**
 * Get the full report by reportId.
 */
async function getReport(reportId) {
  if (!getIsConnected() || !PerformanceReport) return null;
  return await PerformanceReport.findOne({ reportId }).lean();
}

/**
 * Get the Student Report view.
 * Includes everything relevant to the student.
 */
async function getStudentReport(reportId) {
  const report = await getReport(reportId);
  if (!report) return null;

  return {
    reportId: report.reportId,
    desk: report.desk,
    generatedAt: report.generatedAt,

    // Executive Summary
    executiveSummary: report.executiveSummary,

    // Session KPIs
    sessionKPIs: report.sessionKPIs,

    // Trade-by-Trade Analysis
    tradeAnalyses: report.tradeAnalyses,

    // Expected vs Actual Workflow
    workflowCompliance: report.workflowCompliance,

    // Decision Analysis
    decisionAnalysis: {
      totalDecisions: report.decisionAnalysis?.totalDecisions,
      correctDecisions: report.decisionAnalysis?.correctDecisions,
      incorrectDecisions: report.decisionAnalysis?.incorrectDecisions,
      accuracy: report.decisionAnalysis?.accuracy,
      decisions: report.decisionAnalysis?.decisions
    },

    // Communication Analysis
    mailEvaluations: report.mailEvaluations,
    communicationCoaching: report.communicationCoaching,

    // Competencies
    competencyScores: report.competencyScores,

    // Timeline
    timeline: report.timeline,

    // Repeated Mistakes
    repeatedMistakes: report.repeatedMistakes,

    // Strengths & Improvements
    recommendations: report.recommendations,
    improvementPlan: report.improvementPlan,

    // Trade Coaching
    tradeCoaching: report.tradeCoaching,

    // Benchmarks
    benchmarks: report.benchmarks,

    // Evidence
    evidenceGraph: report.evidenceGraph
  };
}

/**
 * Get the Mentor Report view.
 * Focused on coaching, trends, and readiness.
 */
async function getMentorReport(reportId) {
  const report = await getReport(reportId);
  if (!report) return null;

  // Fetch learning profile for trend data
  let learningProfile = null;
  if (getIsConnected() && LearningProfile) {
    learningProfile = await LearningProfile.findOne({ userId: report.userId }).lean();
  }

  // Fetch competency profile for history
  let competencyProfile = null;
  if (getIsConnected() && CompetencyProfile) {
    competencyProfile = await CompetencyProfile.findOne({ userId: report.userId }).lean();
  }

  return {
    reportId: report.reportId,
    userId: report.userId,
    desk: report.desk,
    generatedAt: report.generatedAt,

    // Mentor Summary
    mentorSummary: report.mentorSummary,

    // Competency Summary
    competencyScores: report.competencyScores,
    competencyHistory: competencyProfile?.competencies || null,
    overallReadiness: competencyProfile?.overallReadiness || 0,

    // Repeated Mistakes
    repeatedMistakes: report.repeatedMistakes,

    // Learning Profile
    improvementTrend: learningProfile?.improvementTrend || "INSUFFICIENT_DATA",
    weakAreas: learningProfile?.weakAreas || [],
    strengths: learningProfile?.strengths || [],
    sessionHistory: learningProfile?.sessions?.slice(0, 10) || [],

    // Coaching Recommendations
    recommendations: report.recommendations,
    improvementPlan: report.improvementPlan,
    tradeCoaching: report.tradeCoaching,
    communicationCoaching: report.communicationCoaching,

    // Readiness Assessment
    readiness: {
      decisionAccuracy: report.sessionKPIs?.decisionAccuracy,
      criticalErrors: report.sessionKPIs?.criticalErrors,
      workflowCompliance: report.sessionKPIs?.avgWorkflowCompliance,
      communicationScore: report.sessionKPIs?.avgMailScore
    }
  };
}

/**
 * Get the Manager Report view.
 * Focused on operational readiness and risk.
 */
async function getManagerReport(reportId) {
  const report = await getReport(reportId);
  if (!report) return null;

  // Fetch competency profile for readiness level
  let competencyProfile = null;
  if (getIsConnected() && CompetencyProfile) {
    competencyProfile = await CompetencyProfile.findOne({ userId: report.userId }).lean();
  }

  const readiness = require("./recommendationEngine").assessReadiness(
    report.competencyScores,
    report.decisionAnalysis
  );

  return {
    reportId: report.reportId,
    userId: report.userId,
    desk: report.desk,
    generatedAt: report.generatedAt,

    // Manager Summary
    managerSummary: report.managerSummary,

    // Operational Readiness
    operationalReadiness: competencyProfile?.overallReadiness || 0,
    readinessLevel: readiness.level,
    readinessLabel: readiness.label,
    readinessColor: readiness.color,

    // Key Metrics
    operationalAccuracy: report.competencyScores?.operationalAccuracy || 0,
    decisionAccuracy: report.sessionKPIs?.decisionAccuracy || 0,
    workflowCompliance: report.sessionKPIs?.avgWorkflowCompliance || 0,
    communicationQuality: report.sessionKPIs?.avgMailScore || 0,

    // Risk Assessment
    criticalErrors: report.sessionKPIs?.criticalErrors || 0,
    highRiskErrors: report.decisionAnalysis?.highRiskErrors || 0,
    riskLevel: report.sessionKPIs?.criticalErrors === 0 ? "Low" :
      report.sessionKPIs?.criticalErrors <= 2 ? "Medium" : "High",

    // Production Readiness
    productionReady: readiness.level === "PRODUCTION_READY" || readiness.level === "ADVANCED",

    // Benchmarks
    benchmarks: report.benchmarks,

    // Session Stats
    totalTrades: report.sessionKPIs?.totalTrades || 0,
    tradesCompleted: report.sessionKPIs?.tradesCompleted || 0,
    totalSessions: competencyProfile?.totalSessions || 1,

    // Competency Overview (summary only)
    competencyScores: report.competencyScores
  };
}

/**
 * List all sessions for a user.
 */
async function getUserSessions(userId, options = {}) {
  if (!getIsConnected() || !PerformanceSession) return [];

  const limit = Math.min(parseInt(options.limit) || 20, 100);
  const skip = parseInt(options.skip) || 0;

  return await PerformanceSession.find({ userId })
    .sort({ sessionStart: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

/**
 * Get a user's competency profile.
 */
async function getCompetencyProfile(userId) {
  if (!getIsConnected() || !CompetencyProfile) return null;
  return await CompetencyProfile.findOne({ userId }).lean();
}

/**
 * Get a user's learning profile.
 */
async function getLearningProfile(userId) {
  if (!getIsConnected() || !LearningProfile) return null;
  return await LearningProfile.findOne({ userId }).lean();
}

/**
 * Get the session timeline.
 */
async function getSessionTimeline(sessionId) {
  const report = await PerformanceReport.findOne({ sessionId }).lean();
  if (!report) return null;
  return report.timeline;
}

module.exports = {
  generateReport,
  getReport,
  getStudentReport,
  getMentorReport,
  getManagerReport,
  getUserSessions,
  getCompetencyProfile,
  getLearningProfile,
  getSessionTimeline
};
