// ============================================================================
// redis.js - Upstash Redis Client
// ============================================================================

const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('Missing REDIS_URL in .env');
}

const redis = new Redis(redisUrl, {
  lazyConnect: false,
  maxRetriesPerRequest: null,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

module.exports = redis;
