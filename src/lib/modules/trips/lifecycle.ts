import { TripStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { assertValidTransition } from "@/lib/modules/trips/state-machine";
import { createAuditLog } from "@/lib/modules/audit/service";
import { publishTripEvent } from "@/lib/modules/trips/realtime";
import { notifyTripUsers } from "@/lib/modules/notifications/trip-events";

export async function updateTripStatus(
  tenantId: string,
  actorUserId: string,
  tripId: string,
  nextStatus: TripStatus,
  actorRole: "rider" | "dispatcher" | "tenant_admin" | "passenger",
  options?: { cancelReason?: string }
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, tenantId } });
  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");

  assertValidTransition(trip.status, nextStatus);

  const timestampPatch: Record<string, Date> = {};
  if (nextStatus === "accepted") timestampPatch.acceptedAt = new Date();
  if (nextStatus === "arrived") timestampPatch.arrivedAt = new Date();
  if (nextStatus === "in_progress") timestampPatch.startedAt = new Date();
  if (nextStatus === "completed") timestampPatch.completedAt = new Date();
  if (nextStatus === "cancelled") timestampPatch.cancelledAt = new Date();

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: nextStatus,
      cancelReason: nextStatus === "cancelled" ? options?.cancelReason ?? trip.cancelReason : trip.cancelReason,
      ...timestampPatch,
      riderId: actorRole === "rider" && trip.riderId ? trip.riderId : trip.riderId
    }
  });

  await createAuditLog({
    tenantId,
    actorUserId,
    action: "trip.status_updated",
    entityType: "trip",
    entityId: tripId,
    beforeJson: { status: trip.status },
    afterJson: { status: nextStatus }
  });
  await publishTripEvent(tenantId, tripId, "trip.status_updated", {
    previousStatus: trip.status,
    status: nextStatus,
    actorRole
  });
  const tripUsers = await prisma.trip.findFirst({
    where: { id: tripId, tenantId },
    select: {
      passenger: { select: { userId: true } },
      rider: { select: { userId: true } }
    }
  });
  if (tripUsers) {
    await notifyTripUsers({
      tenantId,
      userIds: [tripUsers.passenger.userId, tripUsers.rider?.userId ?? ""],
      title: "Trip status updated",
      message: `Trip ${tripId.slice(0, 8)} is now ${nextStatus}.`,
      payload: {
        tripId,
        previousStatus: trip.status,
        status: nextStatus
      }
    });
  }

  return updated;
}
