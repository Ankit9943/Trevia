// In test environment, provide a minimal in-memory stub for Redis to avoid external dependency issues

// to make fake redis operations non-blocking and avoid hanging tests
if (
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.NODE_ENV === "test"
) {
  const store = new Map();
  module.exports = {
    async set(key, value, mode, ttlSeconds) {
      store.set(key, value);
      if (mode === "EX" && typeof ttlSeconds === "number") {
        setTimeout(() => store.delete(key), ttlSeconds * 1000).unref?.();
      }
      return "OK";
    },
    async get(key) {
      return store.get(key) ?? null;
    },
  };
} else {
  const { Redis } = require("ioredis");
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  });
  redis.on("connect", () => {
    console.log("Connected to Redis");
  });
  module.exports = redis;
}
