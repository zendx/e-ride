import { redis } from "@/lib/redis/client";
import { logger } from "@/lib/logger";

export function getTripChannel(tenantId: string, tripId: string) {
  return `trip:${tenantId}:${tripId}`;
}

export function getTenantOpsChannel(tenantId: string) {
  return `tenant:ops:${tenantId}`;
}

export function getSuperAdminOpsChannel() {
  return "superadmin:ops";
}

export async function publishTripEvent(
  tenantId: string,
  tripId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const message = JSON.stringify({
    event,
    tripId,
    timestamp: new Date().toISOString(),
    payload
  });

  try {
    await Promise.all([
      redis.publish(getTripChannel(tenantId, tripId), message),
      redis.publish(getTenantOpsChannel(tenantId), message),
      redis.publish(getSuperAdminOpsChannel(), message)
    ]);
  } catch (error) {
    logger.warn({ error, tenantId, tripId, event }, "Failed to publish trip event");
  }
}
