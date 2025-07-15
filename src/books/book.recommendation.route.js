const express = require('express');
const router = express.Router();
const Order = require('../orders/order.model');
const Book = require('./book.model');
const verifyToken = require('../middleware/verifyToken');
const { redisClient } = require('../config/redisClient');

/**
 * GET /
 *
 * Personalized recommendations based on user's order history,
 * but for unauthenticated users returns an empty list.
 */
router.get('/', async (req, res) => {
  // If no auth header, return empty
  if (!req.headers.authorization) {
    return res.status(200).json({ recommendedBooks: [] });
  }

  // Verify token—if invalid, treat as unauthenticated
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch {
    return res.status(200).json({ recommendedBooks: [] });
  }

  try {
    const userEmail = req.user.email;
    const cacheKey = `recommendations:${userEmail}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({ recommendedBooks: JSON.parse(cached) });
    }

    // ← Now returns a real Promise
    const orders = await Order
      .find({ email: userEmail })
      .populate('productIds')
      .exec();

    if (!orders.length) {
      redisClient.set(cacheKey, JSON.stringify([]), { EX: 300 });
      return res.status(200).json({ recommendedBooks: [] });
    }

    const purchasedBooks = orders.flatMap(order => order.productIds);
    const genreCount = purchasedBooks.reduce((acc, book) => {
      if (book.category) acc[book.category] = (acc[book.category] || 0) + 1;
      return acc;
    }, {});

    const topGenre = Object.keys(genreCount).reduce(
      (a, b) => (genreCount[a] > genreCount[b] ? a : b),
      null
    );

    const purchasedIds = purchasedBooks.map(b => b._id);

    // ← Now returns a real Promise
    const recommended = await Book
      .find({ category: topGenre, _id: { $nin: purchasedIds } })
      .limit(10)
      .lean()
      .exec();

    redisClient.set(cacheKey, JSON.stringify(recommended), { EX: 300 });
    res.status(200).json({ recommendedBooks: recommended });
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
});

module.exports = router;
