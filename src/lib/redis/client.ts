import Redis from "ioredis";

declare global {
  var __redis: Redis | undefined;
}

export const redis =
  global.__redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

if (process.env.NODE_ENV !== "production") {
  global.__redis = redis;
}
