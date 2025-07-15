// src/middleware/verifyAdminToken.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET_KEY;

module.exports = (req, res, next) => {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") && header.slice(7);

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied. No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Invalid credentials" });
    }
    // we know this JWT came from your Admin login route
    req.isAdmin = true;
    req.adminId = payload.id;
    next();
  });
};
