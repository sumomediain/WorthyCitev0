import IORedis from "ioredis";

// Reuse the existing basic redis config
export const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});
