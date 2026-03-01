import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";

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

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, tenantId: auth.tenantId },
      select: {
        id: true,
        status: true,
        riderId: true,
        fareTotalMinor: true,
        commissionMinor: true,
        tenantRevenueMinor: true,
        completedAt: true
      }
    });
    if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
    if (trip.riderId !== rider.id) {
      throw new AppError("Rider is not assigned to this trip", 403, "trip_not_assigned_to_rider");
    }
    if (trip.status !== "completed") {
      throw new AppError("Earnings receipt is available only for completed trips", 409, "trip_not_completed");
    }

    const grossMinor = trip.fareTotalMinor;
    const platformCommissionMinor = trip.commissionMinor;
    const tenantRevenueMinor = trip.tenantRevenueMinor;
    const riderEarningsMinor = Math.max(0, grossMinor - platformCommissionMinor - tenantRevenueMinor);

    return ok({
      tripId: trip.id,
      completedAt: trip.completedAt,
      earnings: {
        grossMinor,
        platformCommissionMinor,
        tenantRevenueMinor,
        riderEarningsMinor
      }
    });
  } catch (error) {
    return fail(error);
  }
}
