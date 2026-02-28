import { redis } from "@/lib/redis/client";
import { AppError } from "@/lib/errors/app-error";

export async function enforceRateLimit(key: string, limit = 60, windowSec = 60) {
  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    if (count > limit) {
      throw new AppError("Too many requests", 429, "rate_limited");
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Rate limiter unavailable", 503, "rate_limiter_unavailable");
    }

    console.warn("Rate limiter unavailable, continuing without Redis.", error);
  }
}
