import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { passengerNearbyRidersSchema } from "@/lib/validation/mobile";

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
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

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const url = new URL(request.url);
    const input = passengerNearbyRidersSchema.parse({
      lat: url.searchParams.get("lat"),
      lng: url.searchParams.get("lng"),
      radiusKm: url.searchParams.get("radiusKm") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined
    });

    const candidates = await prisma.riderProfile.findMany({
      where: {
        tenantId: auth.tenantId,
        availability: "online",
        lat: { not: null },
        lng: { not: null },
        user: {
          status: "active"
        }
      },
      orderBy: { updatedAt: "desc" },
      take: Math.max(input.limit * 3, 60),
      select: {
        id: true,
        lat: true,
        lng: true,
        rating: true,
        totalTrips: true,
        vehicleType: true,
        vehiclePlate: true,
        user: {
          select: {
            fullName: true
          }
        }
      }
    });

    const riders = candidates
      .filter((rider) => rider.lat != null && rider.lng != null)
      .map((rider) => {
        const km = distanceKm(input.lat, input.lng, rider.lat!, rider.lng!);
        return {
          ...rider,
          distanceKm: Number(km.toFixed(2))
        };
      })
      .filter((rider) => rider.distanceKm <= input.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, input.limit);

    return ok({
      center: { lat: input.lat, lng: input.lng, radiusKm: input.radiusKm },
      riders
    });
  } catch (error) {
    return fail(error);
  }
}
