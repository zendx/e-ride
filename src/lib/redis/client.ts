import Redis from "ioredis";
import { logger } from "@/lib/logger";

declare global {
  var __redis: Redis | undefined;
}

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
let redisUnavailableLogged = false;

function attachRedisErrorHandlers(client: Redis, label: string) {
  client.on("connect", () => {
    redisUnavailableLogged = false;
  });
  client.on("error", (error) => {
    if (redisUnavailableLogged) return;
    redisUnavailableLogged = true;
    logger.warn({ error, redisUrl, client: label }, "Redis unavailable; realtime features will degrade");
  });
}

function getRedisOptions() {
  return {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 250, 1000);
    }
  } as const;
}

function createBaseRedisClient() {
  const client = new Redis(redisUrl, getRedisOptions());
  attachRedisErrorHandlers(client, "primary");
  return client;
}

export function createRedisSubscriber() {
  const subscriber = redis.duplicate(getRedisOptions());
  attachRedisErrorHandlers(subscriber, "subscriber");
  return subscriber;
}

export const redis = global.__redis ?? createBaseRedisClient();

if (process.env.NODE_ENV !== "production") {
  global.__redis = redis;
}
