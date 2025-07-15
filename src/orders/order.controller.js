// back_end/src/orders/order.controller.js
const Order = require("./order.model");
const { redisClient } = require("../config/redisClient");

// Create a new order (status will default to 'pending')
const createAOrder = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const orderData = { ...req.body, status: "pending", userId: uid, email };
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    // Invalidate caches
    await redisClient.del(`ordersByEmail:${email}`);
    await redisClient.del("ordersAll");

    res.status(200).json(savedOrder);
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

// Get orders by user email (for customers to view their own orders)
const getOrderByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    // --- Authorization check: owner or admin only ---
    if (req.user.email !== email && !req.isAdmin) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot view other users’ orders" });
    }

    // ← Added .exec() so this await is on a real Promise
    const orders = await Order.find({ email })
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Get all orders (for admin dashboard)
const getAllOrders = async (req, res) => {
  try {
    // ← Added .exec() so this await is on a real Promise
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Update order status (for admin to approve or deny an order)
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    if (!["approved", "denied"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Invalid status. Use 'approved' or 'denied'." });
    }

    // ← Added .exec() so this await is on a real Promise
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).exec();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Invalidate caches
    await redisClient.del(`ordersByEmail:${order.email}`);
    await redisClient.del(`ordersAll:${req.baseUrl}`);  // e.g. "ordersAll:/api/orders"

    res.status(200).json(order);
  } catch (error) {
    console.error("Error updating order status", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

module.exports = {
  createAOrder,
  getOrderByEmail,
  getAllOrders,
  updateOrderStatus,
};
