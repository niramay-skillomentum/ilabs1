const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "sgb_ops_simulator_fallback_secret";

function authenticateToken(req, res, next) {
  // Check Authorization header first
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // Fallback: check cookie
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc, c) => {
      const [key, val] = c.trim().split("=");
      acc[key] = val;
      return acc;
    }, {});
    token = cookies["auth_token"];
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, fullName }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
