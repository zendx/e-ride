import { redis } from "@/lib/redis/client";
import { AppError } from "@/lib/errors/app-error";

export async function enforceRateLimit(key: string, limit = 60, windowSec = 60) {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  if (count > limit) {
    throw new AppError("Too many requests", 429, "rate_limited");
  }
}
