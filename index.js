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

const port = process.env.PORT || 5000;

// Middleware
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
      scriptSrc: [
        "'self'",
        "https://www.google.com",
        "https://www.gstatic.com",
      ],
      frameSrc: ["'self'", "https://www.google.com"],
      imgSrc: ["'self'", "data:", "https://www.gstatic.com"],
    },
  })
);

// Add request size limits (DoS protection)
app.use(express.json({ limit: '2mb' }));                  // Changed line
app.use(express.urlencoded({ extended: true, limit: '2mb' })); // New line

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

// Serve static files from the "uploads" folder
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Routes
const bookRoutes = require("./src/books/book.route");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const verifyAdminToken = require("./src/middleware/verifyAdminToken");
const adminRoutes = require("./src/stats/admin.stats");
const feedbackRoutes = require("./src/feedback/feedback.route");
const recommendationRoutes = require("./src/books/book.recommendation.route");

// Mount routes
app.use("/api/books/recommendations", recommendationRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/admin", verifyAdminToken, adminRoutes);
app.use("/api/feedback", feedbackRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Book Store Server is running!");
});

// Catch-all for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// —————— BOOTSTRAP REDIS, MONGO & SERVER ——————
(async () => {
  try {
    // 1) Connect to Redis
    await initRedis();

    // 2) Connect to MongoDB
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB connected successfully!");

    // 3) Start Express server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
// —————————————————————————————————————————————