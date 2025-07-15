// back_end/src/feedback/feedback.route.js
const express = require('express');
const router = express.Router();
const Feedback = require('./feedback.model');
const { redisClient } = require('../config/redisClient');
const verifyToken = require('../middleware/verifyToken');

const CACHE_KEY = 'feedback:words';
const CACHE_TTL = 300; // seconds

// POST endpoint as before...
router.post('/', verifyToken, async (req, res) => {
  const { word } = req.body;
  if (!word || word.trim() === '') {
    return res.status(400).json({ message: 'Word is required.' });
  }

  try {
    const normalized = word.toLowerCase().trim();

    // ← Now awaiting a real Promise
    const existingWord = await Feedback.findOne({ word: normalized }).exec();
    if (existingWord) {
      return res.status(409).json({ message: 'Word already exists.' });
    }

    const newFeedback = new Feedback({ word: normalized });
    await newFeedback.save();

    // Invalidate the exact cache key your middleware set:
    await redisClient.del(`${CACHE_KEY}:${req.originalUrl}`);

    return res
      .status(201)
      .json({ message: 'Word added successfully.', word: newFeedback.word });
  } catch (err) {
    console.error('Error saving feedback:', err);
    return res.status(500).json({ message: 'Error adding feedback.' });
  }
});

// GET endpoint to retrieve all feedback words
router.get('/', async (req, res) => {
  try {
    // 1) Try cache
    const cacheKey = `${CACHE_KEY}:${req.originalUrl}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ words: JSON.parse(cached) });
    }

    // 2) Cache miss
    // ← Now awaiting a real Promise
    const feedbackDocs = await Feedback.find({})
      .select('word -_id')
      .exec();
    const words = feedbackDocs.map(doc => doc.word);

    // 3) Store in cache
    await redisClient.set(cacheKey, JSON.stringify(words), { EX: CACHE_TTL });

    res.json({ words });
  } catch (err) {
    console.error('Error retrieving feedback:', err);
    res.status(500).json({ message: 'Error retrieving feedback.' });
  }
});

module.exports = router;
