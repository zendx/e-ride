import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail } from "@/lib/http";
import { getLiveTripSnapshot } from "@/lib/modules/trips/live";
import { createTripEventStreamResponse } from "@/lib/modules/trips/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await context.params;
    const rider = await prisma.riderProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!rider) throw new AppError("Rider profile not found", 404, "rider_not_found");

    const snapshot = await getLiveTripSnapshot(auth.tenantId, tripId);
    if (snapshot.trip.riderId !== rider.id) {
      throw new AppError("Rider is not assigned to this trip", 403, "trip_not_assigned_to_rider");
    }

    return createTripEventStreamResponse({
      request,
      tenantId: auth.tenantId,
      tripId
    });
  } catch (error) {
    return fail(error);
  }
}
