// backend/src/orders/order.route.js
const express = require("express");
const {
  createAOrder,
  getOrderByEmail,
  getAllOrders,
  updateOrderStatus,
} = require("./order.controller");
const verifyToken = require("../middleware/verifyToken");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const { cache } = require("../middleware/cache");    // ← import cache middleware
const router = express.Router();

// Endpoint for creating an order (accessible to authenticated users)
router.post("/", verifyToken, createAOrder);

// Endpoint for retrieving orders by user email (protected so that only authenticated users can access their orders)
// Cached per‑user for 120 seconds
router.get(
  "/email/:email",
  verifyToken,
  cache("ordersByEmail", 120),
  getOrderByEmail
);

// Endpoint for admin to get all orders (authentication and additional admin check can be added as needed)
// Cached for 60 seconds
router.get("/", verifyAdminToken, cache("ordersAll", 60), getAllOrders);

// Endpoint for admin to update order status (authentication and additional admin check can be added as needed)
router.patch("/:id", verifyAdminToken, updateOrderStatus);

module.exports = router;
