import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { calculateFare } from "@/lib/modules/trips/fare-engine";
import { findNearestOnlineRider } from "@/lib/modules/dispatch/matching";
import { createAuditLog } from "@/lib/modules/audit/service";

export async function createPassengerTrip(tenantId: string, passengerId: string, input: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
}) {
  const [tenant, pricing] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.pricingRule.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } })
  ]);

  if (!tenant || !pricing) throw new AppError("Tenant pricing is not configured", 400, "pricing_missing");

  const fare = calculateFare(pricing, input.estimatedDistanceKm, input.estimatedDurationMin, tenant.platformCommissionBps);

  const assignedRiderId = await findNearestOnlineRider(tenantId, input.pickupLat, input.pickupLng);

  const trip = await prisma.trip.create({
    data: {
      tenantId,
      passengerId,
      riderId: assignedRiderId,
      status: assignedRiderId ? "assigned" : "requested",
      ...input,
      fareSubtotalMinor: fare.subtotalMinor,
      fareSurgeMinor: fare.surgeMinor,
      fareFeesMinor: fare.feesMinor,
      fareTotalMinor: fare.totalMinor,
      commissionMinor: fare.commissionMinor,
      tenantRevenueMinor: fare.tenantRevenueMinor
    }
  });

  await createAuditLog({
    tenantId,
    action: "trip.created",
    entityType: "trip",
    entityId: trip.id,
    afterJson: trip
  });

  return trip;
}

export async function assignTripByDispatcher(tenantId: string, dispatcherId: string, tripId: string, riderId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, tenantId } });
  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");

  const rider = await prisma.riderProfile.findFirst({ where: { id: riderId, tenantId } });
  if (!rider) throw new AppError("Rider not found", 404, "rider_not_found");

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { riderId, dispatcherId, status: "assigned" }
  });

  await createAuditLog({
    tenantId,
    actorUserId: dispatcherId,
    action: "trip.assigned",
    entityType: "trip",
    entityId: tripId,
    beforeJson: trip,
    afterJson: updated
  });

  return updated;
}
