import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { riderLocationPingSchema } from "@/lib/validation/mobile";
import { publishTripEvent } from "@/lib/modules/trips/realtime";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = riderLocationPingSchema.parse(body);

    const rider = await prisma.riderProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!rider) throw new AppError("Rider profile not found", 404, "rider_not_found");

    const riderUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { status: true }
    });
    if (!riderUser || riderUser.status !== "active") {
      throw new AppError("Rider approval pending. Await tenant approval.", 403, "rider_not_approved");
    }

    await prisma.riderProfile.update({
      where: { id: rider.id },
      data: {
        lat: input.lat,
        lng: input.lng
      }
    });

    const ping = await prisma.driverLocationPing.create({
      data: {
        tenantId: auth.tenantId,
        riderId: rider.id,
        tripId: input.tripId,
        lat: input.lat,
        lng: input.lng,
        heading: input.heading,
        speedKph: input.speedKph,
        accuracyMeters: input.accuracyMeters
      }
    });

    if (input.tripId) {
      await publishTripEvent(auth.tenantId, input.tripId, "trip.location_ping", {
        lat: input.lat,
        lng: input.lng,
        heading: input.heading,
        speedKph: input.speedKph,
        accuracyMeters: input.accuracyMeters
      });
    }

    return ok(ping);
  } catch (error) {
    return fail(error);
  }
}
