// src/config/redisClient.js

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', err => {
  console.error('Redis Client Error', err);
});

/**
 * Call this once at startup to connect Redis.
 */
async function initRedis() {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    process.exit(1);
  }
}

module.exports = { redisClient, initRedis };
