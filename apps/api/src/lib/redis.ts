import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URI = process.env.REDIS_URI || "redis://localhost:6379";

const redis = new Redis(REDIS_URI, {
    maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
    console.error("Redis Client Error", err);
});

redis.on("connect", () => {
    console.log("Redis Connected Successfully");
});

export default redis;
