import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";

function estimateEtaMinutes(distanceKm: number, avgSpeedKph = 28) {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / avgSpeedKph) * 60));
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthKm * c;
}

export async function getLiveTripSnapshot(tenantId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, tenantId },
    select: {
      id: true,
      status: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
      riderId: true,
      passengerId: true,
      requestedAt: true,
      acceptedAt: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true
    }
  });

  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");

  const latestPing = trip.riderId
    ? await prisma.driverLocationPing.findFirst({
      where: {
        tenantId,
        tripId: trip.id
      },
      orderBy: { createdAt: "desc" },
      select: {
        lat: true,
        lng: true,
        heading: true,
        speedKph: true,
        accuracyMeters: true,
        createdAt: true
      }
    })
    : null;

  let etaToPickupMin: number | null = null;
  let etaToDropoffMin: number | null = null;
  if (latestPing) {
    const distanceToPickupKm = haversineKm(latestPing.lat, latestPing.lng, trip.pickupLat, trip.pickupLng);
    const distanceToDropoffKm = haversineKm(latestPing.lat, latestPing.lng, trip.dropoffLat, trip.dropoffLng);
    etaToPickupMin = estimateEtaMinutes(distanceToPickupKm);
    etaToDropoffMin = estimateEtaMinutes(distanceToDropoffKm);
  }

  return {
    trip,
    latestPing,
    eta: {
      toPickupMin: etaToPickupMin,
      toDropoffMin: etaToDropoffMin
    }
  };
}
