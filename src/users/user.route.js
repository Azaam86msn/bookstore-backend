// backend/src/auth/admin.route.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const Admin = require("./user.model");
const { redisClient } = require("../config/redisClient");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60; // seconds

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min per IP
  max: 20,
  message: {
    message: "Too many login attempts from this IP. Try again later.",
  },
});

// Helper to build Redis keys
const attemptsKey    = username => `login:attempts:${username}`;
const lockedUntilKey = username => `login:lockedUntil:${username}`;

async function getAttempts(username) {
  const val = await redisClient.get(attemptsKey(username));
  return val ? parseInt(val, 10) : 0;
}

async function recordFailure(username) {
  const keyA = attemptsKey(username);
  const keyL = lockedUntilKey(username);

  const attempts = await redisClient.incr(keyA);
  if (attempts === 1) {
    await redisClient.expire(keyA, LOCK_TIME);
  }

  if (attempts >= MAX_ATTEMPTS) {
    await redisClient.set(keyL, Date.now() + LOCK_TIME * 1000, { EX: LOCK_TIME });
    await redisClient.del(keyA);
  }
}

async function isLocked(username) {
  const lockTs = await redisClient.get(lockedUntilKey(username));
  if (!lockTs) return false;
  const until = parseInt(lockTs, 10);
  if (Date.now() < until) {
    return true;
  }
  await redisClient.del(lockedUntilKey(username));
  return false;
}

async function clearLock(username) {
  await redisClient.del(attemptsKey(username), lockedUntilKey(username));
}

router.post("/admin", loginLimiter, async (req, res) => {
  const { username, password, captchaToken } = req.body;

  if (!captchaToken) {
    return res.status(400).json({ message: "CAPTCHA token is required" });
  }

  // 1) Verify reCAPTCHA
  try {
    const { data } = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      { params: { secret: RECAPTCHA_SECRET, response: captchaToken } }
    );
    if (!data.success || data.score < 0.5 || data.action !== "admin_login") {
      return res.status(403).json({ message: "CAPTCHA verification failed" });
    }
  } catch (err) {
    console.error("CAPTCHA error:", err);
    return res.status(500).json({ message: "CAPTCHA validation failed" });
  }

  // 2) Check for per‑user lockout
  if (await isLocked(username)) {
    return res
      .status(429)
      .json({ message: "Account temporarily locked. Try again later." });
  }

  // 3) Authenticate credentials
  try {
    // ← Added .exec() so this await is on a real Promise
    const admin = await Admin.findOne({ username }).exec();
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      await recordFailure(username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 4) On success: clear any existing locks/attempts
    await clearLock(username);

    // Issue JWT
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Authentication successful",
      token,
      user: { username: admin.username },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Failed to login as admin" });
  }
});

module.exports = router;
