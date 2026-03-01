import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { tripStatusUpdateSchema } from "@/lib/validation/trip";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db";
import { updateTripStatus } from "@/lib/modules/trips/lifecycle";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);

    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await context.params;
    const body = await request.json();
    const input = tripStatusUpdateSchema.parse(body);

    const rider = await prisma.riderProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!rider) throw new AppError("Rider not found", 404, "rider_not_found");
    const riderUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { status: true }
    });
    if (!riderUser || riderUser.status !== "active") {
      throw new AppError("Rider approval pending. Await tenant approval.", 403, "rider_not_approved");
    }

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, tenantId: auth.tenantId },
      select: { id: true, riderId: true }
    });
    if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
    if (trip.riderId !== rider.id) {
      throw new AppError("Rider is not assigned to this trip", 403, "trip_not_assigned_to_rider");
    }

    const updated = await updateTripStatus(auth.tenantId, auth.userId, tripId, input.status, "rider", {
      cancelReason: input.cancelReason
    });
    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
