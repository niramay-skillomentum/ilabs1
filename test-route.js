const http = require("http");
const jwt = require("jsonwebtoken");

const secret = "sgb_ops_simulator_secret_key_2026";
const token = jwt.sign({ userId: "testuser", fullName: "Test User" }, secret, { expiresIn: '1h' });

const hugeContext = { 
  id: "trade_123", 
  details: "A".repeat(50000) // 50kb string
};

const data = JSON.stringify({ 
  message: "Hello", 
  desk: "SETTLEMENT", 
  tradeContext: hugeContext, 
  history: [] 
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/chat/tutor',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseBody = '';
  res.on('data', chunk => { responseBody += chunk; });
  res.on('end', () => { console.log("Response length:", responseBody.length); });
});

req.on('error', error => {
  console.error("Request Error:", error);
});

req.write(data);
req.end();
