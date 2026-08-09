// ======================================
// BENCHMARK ENGINE
// Provides reference benchmarks for comparison.
// Zero AI — uses configurable baselines and
// historical data from CompetencyProfile.
// ======================================

const { getIsConnected } = require("../../db");

let CompetencyProfile;
try {
  CompetencyProfile = require("../../models/CompetencyProfile");
} catch (e) {
  CompetencyProfile = null;
}

// ── Configurable Benchmarks ──
// Time benchmarks in seconds per trade by desk
const TIME_BENCHMARKS = {
  MO: { target: 180, good: 240, acceptable: 360 },             // 3–6 min
  CONFIRMATION: { target: 240, good: 300, acceptable: 420 },    // 4–7 min
  SETTLEMENT: { target: 300, good: 360, acceptable: 480 },      // 5–8 min
  RECONCILIATION: { target: 120, good: 180, acceptable: 300 }   // 2–5 min
};

// Session-level benchmarks
const SESSION_BENCHMARKS = {
  minCompletionRate: 70,     // % of trades completed in session
  targetAccuracy: 85,         // % decision accuracy
  targetCompliance: 80,       // % workflow compliance
  targetCommunication: 70     // % email quality
};

/**
 * Get time benchmarks for a desk.
 */
function getTimeBenchmarks(desk) {
  return TIME_BENCHMARKS[desk] || TIME_BENCHMARKS.MO;
}

/**
 * Calculate peer percentile for a user's competency scores.
 * Compares against all CompetencyProfiles in the system.
 *
 * @param {string} userId
 * @param {Object} competencyScores - The user's current scores
 * @returns {Object} Percentile rankings
 */
async function calculatePeerPercentile(userId, competencyScores) {
  if (!getIsConnected() || !CompetencyProfile) {
    return { overallPercentile: 50, competencyPercentiles: {} };
  }

  try {
    const allProfiles = await CompetencyProfile.find({}).lean();

    if (allProfiles.length <= 1) {
      return { overallPercentile: 50, competencyPercentiles: {} };
    }

    // Calculate overall readiness percentile
    const allReadiness = allProfiles.map(p => p.overallReadiness || 0).sort((a, b) => a - b);
    const userReadiness = competencyScores.overallReadiness ||
      calculateWeightedAverage(competencyScores);

    const overallPercentile = calculatePercentile(allReadiness, userReadiness);

    // Calculate per-competency percentiles
    const competencyPercentiles = {};
    const competencyKeys = Object.keys(competencyScores);

    for (const key of competencyKeys) {
      const allScores = allProfiles
        .map(p => p.competencies?.[key]?.score || 0)
        .sort((a, b) => a - b);
      competencyPercentiles[key] = calculatePercentile(allScores, competencyScores[key] || 0);
    }

    return { overallPercentile, competencyPercentiles };
  } catch (err) {
    console.warn("[OPI] Peer percentile calculation failed:", err.message);
    return { overallPercentile: 50, competencyPercentiles: {} };
  }
}

/**
 * Generate benchmark comparison for a session.
 *
 * @param {Object} params
 * @param {string} params.desk
 * @param {number} params.avgTimePerTrade - In seconds
 * @param {number} params.decisionAccuracy - 0–100
 * @param {number} params.workflowCompliance - 0–100
 * @param {number} params.communicationScore - 0–100
 * @param {number} params.completionRate - 0–100
 * @returns {Object} Benchmark comparison
 */
function compareToBenchmarks({ desk, avgTimePerTrade, decisionAccuracy, workflowCompliance, communicationScore, completionRate }) {
  const timeBench = getTimeBenchmarks(desk);

  const timeRating = avgTimePerTrade <= timeBench.target ? "EXCELLENT"
    : avgTimePerTrade <= timeBench.good ? "GOOD"
    : avgTimePerTrade <= timeBench.acceptable ? "ACCEPTABLE"
    : "NEEDS_IMPROVEMENT";

  const accuracyRating = decisionAccuracy >= 95 ? "EXCELLENT"
    : decisionAccuracy >= SESSION_BENCHMARKS.targetAccuracy ? "GOOD"
    : decisionAccuracy >= 70 ? "ACCEPTABLE"
    : "NEEDS_IMPROVEMENT";

  const complianceRating = workflowCompliance >= 95 ? "EXCELLENT"
    : workflowCompliance >= SESSION_BENCHMARKS.targetCompliance ? "GOOD"
    : workflowCompliance >= 60 ? "ACCEPTABLE"
    : "NEEDS_IMPROVEMENT";

  const communicationRating = communicationScore >= 90 ? "EXCELLENT"
    : communicationScore >= SESSION_BENCHMARKS.targetCommunication ? "GOOD"
    : communicationScore >= 50 ? "ACCEPTABLE"
    : "NEEDS_IMPROVEMENT";

  return {
    time: {
      actual: avgTimePerTrade,
      benchmark: timeBench,
      rating: timeRating
    },
    accuracy: {
      actual: decisionAccuracy,
      benchmark: SESSION_BENCHMARKS.targetAccuracy,
      rating: accuracyRating
    },
    compliance: {
      actual: workflowCompliance,
      benchmark: SESSION_BENCHMARKS.targetCompliance,
      rating: complianceRating
    },
    communication: {
      actual: communicationScore,
      benchmark: SESSION_BENCHMARKS.targetCommunication,
      rating: communicationRating
    },
    completion: {
      actual: completionRate,
      benchmark: SESSION_BENCHMARKS.minCompletionRate,
      met: completionRate >= SESSION_BENCHMARKS.minCompletionRate
    }
  };
}

// ── Helpers ──

function calculatePercentile(sortedArray, value) {
  if (sortedArray.length === 0) return 50;
  const below = sortedArray.filter(v => v < value).length;
  return Math.round((below / sortedArray.length) * 100);
}

function calculateWeightedAverage(scores) {
  const values = Object.values(scores).filter(v => typeof v === "number" && v > 0);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

module.exports = {
  getTimeBenchmarks,
  calculatePeerPercentile,
  compareToBenchmarks,
  TIME_BENCHMARKS,
  SESSION_BENCHMARKS
};
