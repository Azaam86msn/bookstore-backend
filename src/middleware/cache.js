import { redisClient } from '../config/redisClient.js';

/**
 * Simple Redis-backed cache middleware.
 * @param {string} prefix   Key prefix to namespace cache entries
 * @param {number} ttl      Time-to-live in seconds
 */
export const cache = (prefix, ttl = 60) => async (req, res, next) => {
  // Skip caching for "read" endpoint (fresh per-user data)
  if (req.path.endsWith('/read')) {
    return next();
  }

  const key = `${prefix}:${req.params.id || req.originalUrl}`;
  try {
    // Attempt to fetch cached response
    const cached = await redisClient.get(key);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Monkey-patch res.json to cache the outgoing body
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      await redisClient.setEx(key, ttl, JSON.stringify(body));
      originalJson(body);
    };

    next();
  } catch (err) {
    console.error('Cache error:', err);
    next();
  }
};
