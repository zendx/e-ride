import { prisma } from "@/lib/db";

function distanceSquared(aLat: number, aLng: number, bLat: number, bLng: number) {
  const x = aLat - bLat;
  const y = aLng - bLng;
  return x * x + y * y;
}

export async function findNearestOnlineRider(tenantId: string, pickupLat: number, pickupLng: number) {
  const riders = await prisma.riderProfile.findMany({
    where: {
      tenantId,
      availability: "online",
      lat: { not: null },
      lng: { not: null }
    },
    take: 100,
    orderBy: { updatedAt: "desc" }
  });

  if (!riders.length) return null;

  const nearest = riders.reduce((best, current) => {
    if (current.lat == null || current.lng == null) return best;
    const d = distanceSquared(current.lat, current.lng, pickupLat, pickupLng);
    if (!best || d < best.distance) return { riderId: current.id, distance: d };
    return best;
  }, null as null | { riderId: string; distance: number });

  return nearest?.riderId ?? null;
}
