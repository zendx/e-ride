import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const rider = await prisma.riderProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!rider) throw new AppError("Rider profile not found", 404, "rider_not_found");

    const trips = await prisma.trip.findMany({
      where: {
        tenantId: auth.tenantId,
        riderId: rider.id,
        status: "completed"
      },
      orderBy: { completedAt: "desc" },
      take: 50,
      select: {
        id: true,
        completedAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        fareTotalMinor: true,
        commissionMinor: true,
        tenantRevenueMinor: true
      }
    });

    const receipts = trips.map((trip) => ({
      ...trip,
      riderEarningsMinor: Math.max(0, trip.fareTotalMinor - trip.commissionMinor - trip.tenantRevenueMinor),
      downloadUrl: `/api/rider/receipts/${trip.id}/download`
    }));

    return ok({ receipts, count: receipts.length });
  } catch (error) {
    return fail(error);
  }
}
