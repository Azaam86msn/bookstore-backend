// index.js
const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// —————— INITIALIZE FIREBASE ADMIN SDK ——————
require("./src/config/firebaseClient");
// ————————————————————————————————————————————

// —————— IMPORT REDIS CONFIG ——————
const { initRedis } = require("./src/config/redisClient");
// —————————————————————————————————

// ─── HEALTH CHECKS ──────────────────────────────────────────────────────────────
app.get("/health",    (_req, res) => res.json({ status: "ok" }));
app.get("/healthz",   (_req, res) => res.json({ status: "ok" }));
// ────────────────────────────────────────────────────────────────────────────────

// Use only the port Render provides
const port = process.env.PORT;
if (!port) {
  console.error("ERROR: PORT environment variable not set");
  process.exit(1);
}

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["'self'", "https://www.google.com"],
      imgSrc: ["'self'", "data:", "https://www.gstatic.com"],
    },
  })
);

// Limit request size
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://woodlandpublishing.vercel.app",
    ],
    credentials: true,
  })
);

// Serve uploads
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);
// ────────────────────────────────────────────────────────────────────────────────

// ─── ROUTES ─────────────────────────────────────────────────────────────────────
const bookRoutes           = require("./src/books/book.route");
const orderRoutes          = require("./src/orders/order.route");
const userRoutes           = require("./src/users/user.route");
const verifyAdminToken     = require("./src/middleware/verifyAdminToken");
const adminRoutes          = require("./src/stats/admin.stats");
const feedbackRoutes       = require("./src/feedback/feedback.route");
const recommendationRoutes = require("./src/books/book.recommendation.route");

app.use("/api/books/recommendations", recommendationRoutes);
app.use("/api/books",                bookRoutes);
app.use("/api/orders",               orderRoutes);
app.use("/api/auth",                 userRoutes);
app.use("/api/admin", verifyAdminToken, adminRoutes);
app.use("/api/feedback",              feedbackRoutes);

// Root
app.get("/", (_req, res) => {
  res.send("Book Store Server is running!");
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: "Not Found" });
});
// ────────────────────────────────────────────────────────────────────────────────

// ─── BOOTSTRAP ──────────────────────────────────────────────────────────────────
(async () => {
  try {
    // 1) Connect Redis
    await initRedis();
    console.log("✅ Connected to Redis");

    // 2) Connect MongoDB
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB connected successfully!");

    // 3) Start HTTP server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
// ────────────────────────────────────────────────────────────────────────────────
