// back_end/src/middleware/verifyToken.js
const admin = require('../config/firebaseClient');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Token missing." });
  }

  admin
    .auth()
    .verifyIdToken(token)
    .then((decodedToken) => {
      req.user = decodedToken;
      next();
    })
    .catch((err) => {
      console.error("Firebase token verification error:", err);
      res.status(403).json({ message: "Invalid token." });
    });
};

module.exports = verifyToken;
