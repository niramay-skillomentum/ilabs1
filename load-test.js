require("dotenv").config();
const jwt = require("jsonwebtoken");

// Configuration
const CONCURRENT_USERS = 100;
const DESK = "MO"; // Can be MO, CONFIRMATION, or SETTLEMENT
const PORT = process.env.PORT || 3002;
const BASE_URL = `http://localhost:${PORT}/api/queue/generate`;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not found in .env file.");
  process.exit(1);
}

async function runLoadTest() {
  console.log(`\n🚀 Starting load test: ${CONCURRENT_USERS} users hitting ${BASE_URL}\n`);

  // 1. Generate 100 fake user tokens
  const tokens = [];
  for (let i = 101; i <= 100 + CONCURRENT_USERS; i++) {
    const payload = {
      userId: `testuser${i}@example.com`,
      fullName: `Test User ${i}`
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "3h" });
    tokens.push({ id: i, token });
  }

  console.log(`✅ Generated ${CONCURRENT_USERS} authentication tokens.`);
  console.log(`🔥 Firing ${CONCURRENT_USERS} concurrent requests NOW...\n`);

  // 2. Prepare the requests
  const requests = tokens.map((user) => {
    const startTime = Date.now();
    return fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({ desk: DESK })
    })
      .then(async (res) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        let data;
        try {
          data = await res.json();
        } catch (e) {
          data = await res.text();
        }
        return {
          userId: user.id,
          status: res.status,
          duration,
          data,
          success: res.ok && data.success === true
        };
      })
      .catch((err) => {
        const endTime = Date.now();
        return {
          userId: user.id,
          status: "NETWORK_ERROR",
          duration: endTime - startTime,
          data: { error: err.message },
          success: false
        };
      });
  });

  // 3. Execute all requests concurrently
  const results = await Promise.all(requests);

  // 4. Generate Detailed Report
  let successful = 0;
  let failed = 0;
  let totalDuration = 0;
  let minDuration = Infinity;
  let maxDuration = 0;

  console.log("-----------------------------------------------------------------------------------------");
  console.log("| User # | Status Code | Duration (ms) | Response Summary                               |");
  console.log("-----------------------------------------------------------------------------------------");

  results.forEach((r) => {
    if (r.success) successful++;
    else failed++;

    totalDuration += r.duration;
    if (r.duration < minDuration) minDuration = r.duration;
    if (r.duration > maxDuration) maxDuration = r.duration;

    // Format response summary
    let summary = "";
    if (r.success) {
      summary = `✅ OK (Queue Size: ${r.data.queueSize})`;
    } else {
      const errMsg = r.data.error || "Unknown Error";
      summary = `❌ FAILED: ${errMsg.substring(0, 40)}`;
    }

    console.log(`| ${String(r.userId).padEnd(6)} | ${String(r.status).padEnd(11)} | ${String(r.duration).padEnd(13)} | ${summary.padEnd(46)} |`);
  });

  console.log("-----------------------------------------------------------------------------------------\n");

  // 5. Generate Summary Statistics
  console.log("📊 LOAD TEST SUMMARY");
  console.log("====================");
  console.log(`Total Requests:    ${CONCURRENT_USERS}`);
  console.log(`Successful:        ${successful} (${(successful / CONCURRENT_USERS * 100).toFixed(1)}%)`);
  console.log(`Failed:            ${failed} (${(failed / CONCURRENT_USERS * 100).toFixed(1)}%)`);
  console.log(`Min Response Time: ${minDuration === Infinity ? 0 : minDuration} ms`);
  console.log(`Max Response Time: ${maxDuration} ms`);
  console.log(`Avg Response Time: ${(totalDuration / CONCURRENT_USERS).toFixed(2)} ms\n`);
}

runLoadTest();
