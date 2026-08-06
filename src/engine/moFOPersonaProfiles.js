// ======================================
// MO FO PERSONA PROFILES
// Per-entity response speed, personality, signatories,
// and time-of-day delay modifiers for MO → FO channel.
// ======================================

// ── ENTITY PERSONA PROFILES ──
const ENTITY_PERSONA_PROFILES = {

  "fo-operations-emea@skillomentum.com": {
    entityCode:    "SBG_LONDON",
    entityName:    "SBG London",
    region:        "EMEA",
    department:    "Rates & FX Middle Office",
    speed:         "FAST",
    minDelayMs:    5000,
    maxDelayMs:    18000,
    personality:   "FORMAL",
    offHoursZone:  "Europe/London",
    offHoursStart: 17,
    offHoursEnd:   9,
    offHoursMultiplier: 1.8,

    signatories: [
      { name: "Oliver Chen",     title: "Senior Operations Analyst" },
      { name: "Priya Sharma",    title: "Trade Support Officer" },
      { name: "James Whitfield", title: "FX Operations Manager" },
      { name: "Amelia Brooks",   title: "Rates Middle Office" },
      { name: "Edward Hartley",  title: "Operations Lead" }
    ],

    misreadChance:     0.10,
    typoChance:        0.05,
    holdingMsgChance:  0.20,
    escalationAfter:   3,
    outOfOfficeChance: 0.03
  },

  "fo-operations-americas@skillomentum.com": {
    entityCode:    "SBG_NEWYORK",
    entityName:    "SBG New York",
    region:        "AMER",
    department:    "Global Markets Operations",
    speed:         "MEDIUM",
    minDelayMs:    12000,
    maxDelayMs:    35000,
    personality:   "EFFICIENT",
    offHoursZone:  "America/New_York",
    offHoursStart: 18,
    offHoursEnd:   8,
    offHoursMultiplier: 2.0,

    signatories: [
      { name: "Sarah Kim",      title: "Operations Specialist" },
      { name: "Marcus Johnson", title: "Trade Support Analyst" },
      { name: "Lisa Chen",      title: "Global Markets Ops" },
      { name: "Ryan Mitchell",  title: "FX Operations Lead" },
      { name: "Amanda Rivera",  title: "Settlements Analyst" }
    ],

    misreadChance:     0.08,
    typoChance:        0.10,
    holdingMsgChance:  0.15,
    escalationAfter:   4,
    outOfOfficeChance: 0.02
  },

  "fo-operations-apac@skillomentum.com": {
    entityCode:    "SBG_SINGAPORE",
    entityName:    "SBG Singapore",
    region:        "APAC",
    department:    "APAC Trade Operations",
    speed:         "SLOW",
    minDelayMs:    40000,
    maxDelayMs:    90000,
    personality:   "CAUTIOUS",
    offHoursZone:  "Asia/Singapore",
    offHoursStart: 18,
    offHoursEnd:   9,
    offHoursMultiplier: 2.5,

    signatories: [
      { name: "Wei Liang",       title: "Operations Analyst" },
      { name: "Deepa Nair",      title: "Trade Support Specialist" },
      { name: "Tan Keng Hwee",   title: "APAC Operations Manager" },
      { name: "Siti Rahimah",    title: "FX Middle Office" },
      { name: "Kenji Watanabe",  title: "Rates Operations" }
    ],

    misreadChance:     0.20,
    typoChance:        0.03,
    holdingMsgChance:  0.35,
    escalationAfter:   2,
    outOfOfficeChance: 0.05
  }

};

// Default profile for unknown/missing entity emails
const DEFAULT_ENTITY_PERSONA = {
  entityCode:        "SBG_UNKNOWN",
  entityName:        "SBG Operations",
  region:            "EMEA",
  department:        "Operations Desk",
  speed:             "MEDIUM",
  minDelayMs:        15000,
  maxDelayMs:        40000,
  personality:       "FORMAL",
  signatories:       [
    { name: "Operations Team", title: "Trade Support" },
    { name: "Alex Morgan",    title: "Operations Analyst" }
  ],
  misreadChance:     0.10,
  typoChance:        0.05,
  holdingMsgChance:  0.15,
  escalationAfter:   3,
  outOfOfficeChance: 0.02
};

/**
 * Get the full persona for an entity email.
 * @param {string|null} entityEmail - e.g. "fo-operations-emea@skillomentum.com"
 * @returns {Object} persona profile
 */
function getEntityPersona(entityEmail) {
  if (!entityEmail) return DEFAULT_ENTITY_PERSONA;
  const key = String(entityEmail).toLowerCase().trim();
  return ENTITY_PERSONA_PROFILES[key] || DEFAULT_ENTITY_PERSONA;
}

/**
 * Calculate delay for an entity reply, including time-of-day modifier.
 * @param {string|null} entityEmail
 * @returns {number} delay in ms
 */
function getEntityDelay(entityEmail) {
  const persona = getEntityPersona(entityEmail);
  const range = persona.maxDelayMs - persona.minDelayMs;
  let baseDelay = persona.minDelayMs + Math.floor(Math.random() * range);

  // Time-of-day modifier: simulates off-hours slower response
  if (persona.offHoursMultiplier && persona.offHoursStart !== undefined) {
    const nowHour = new Date().getUTCHours();
    // Simplified: we use UTC and approximate the offset.
    // EMEA ~ UTC+0/+1, AMER ~ UTC-5, APAC ~ UTC+8
    let localHour = nowHour;
    if (persona.region === "AMER") localHour = (nowHour - 5 + 24) % 24;
    else if (persona.region === "APAC") localHour = (nowHour + 8) % 24;

    const offStart = persona.offHoursStart;
    const offEnd = persona.offHoursEnd;
    let isOffHours = false;
    if (offStart > offEnd) {
      // Overnight range, e.g. 17 → 9
      isOffHours = localHour >= offStart || localHour < offEnd;
    } else {
      isOffHours = localHour >= offStart && localHour < offEnd;
    }

    if (isOffHours) {
      baseDelay = Math.floor(baseDelay * persona.offHoursMultiplier);
    }
  }

  // Add ±20% jitter
  const jitter = Math.floor(baseDelay * 0.2 * (Math.random() * 2 - 1));
  return Math.max(3000, baseDelay + jitter); // Floor at 3s
}

/**
 * Randomly pick a signatory from the persona.
 * @param {Object} persona
 * @returns {{ name: string, title: string }}
 */
function pickSignatory(persona) {
  if (!persona || !persona.signatories || persona.signatories.length === 0) {
    return { name: "Operations Team", title: "Trade Support" };
  }
  const idx = Math.floor(Math.random() * persona.signatories.length);
  return persona.signatories[idx];
}

/**
 * Generate a formatted sign-off line for an entity persona.
 * @param {Object} persona
 * @returns {string}
 */
function generateSignOff(persona) {
  const sig = pickSignatory(persona);
  return `\n\nKind regards,\n\n--\n${sig.name}\n${sig.title} | ${persona.department} | ${persona.entityName}`;
}

module.exports = {
  ENTITY_PERSONA_PROFILES,
  DEFAULT_ENTITY_PERSONA,
  getEntityPersona,
  getEntityDelay,
  pickSignatory,
  generateSignOff
};
