// back_end/src/stats/admin.stats.js
const express = require('express');
const Order = require('../orders/order.model');
const Book = require('../books/book.model');
const router = express.Router();

// Function to calculate admin stats
router.get('/', async (req, res) => {
  try {
    // 1. Total number of orders
    const totalOrders = await Order.countDocuments().exec();

    // 2. Total sales (sum of all totalPrice from orders)
    const totalSalesAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]).exec();

    // 3. Trending books statistics:
    const trendingBooksCountAgg = await Book.aggregate([
      { $match: { trending: true } },
      { $count: 'trendingBooksCount' },
    ]).exec();
    const trendingBooks =
      trendingBooksCountAgg[0]?.trendingBooksCount || 0;

    // 4. Total number of books
    const totalBooks = await Book.countDocuments().exec();

    // 5. Monthly sales (group by month and sum total sales for each month)
    const monthlySales = await Order.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' },
          },
          totalSales: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    // Result summary
    res.status(200).json({
      totalOrders,
      totalSales: totalSalesAgg[0]?.totalSales || 0,
      trendingBooks,
      totalBooks,
      monthlySales,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
