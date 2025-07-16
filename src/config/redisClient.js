// src/config/redisClient.js

const { createClient } = require('redis');

let redisClient;

/**
 * Call this once at startup to connect Redis.
 * If REDIS_URL is not set, Redis is skipped.
 */
async function initRedis() {
  const REDIS_URL = process.env.REDIS_URL;

  if (!REDIS_URL) {
    console.warn('⚠️  REDIS_URL not set — skipping Redis initialization');
    return;
  }

  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', err => {
    console.error('Redis Client Error', err);
  });

  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    process.exit(1);
  }
}

module.exports = { redisClient, initRedis };
