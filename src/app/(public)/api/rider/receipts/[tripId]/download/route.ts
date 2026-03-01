import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail } from "@/lib/http";

type Params = { params: Promise<{ tripId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await params;
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
        pickupAddress: true,
        dropoffAddress: true,
        completedAt: true,
        fareTotalMinor: true,
        commissionMinor: true,
        tenantRevenueMinor: true
      }
    });
    if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
    if (trip.riderId !== rider.id) throw new AppError("Rider is not assigned to this trip", 403, "trip_not_assigned_to_rider");
    if (trip.status !== "completed") throw new AppError("Receipt is available only for completed trips", 409, "trip_not_completed");

    const riderEarningsMinor = Math.max(0, trip.fareTotalMinor - trip.commissionMinor - trip.tenantRevenueMinor);
    const receipt = [
      "CarryGo Rider Earnings Receipt",
      `Trip: ${trip.id}`,
      `Completed: ${trip.completedAt?.toISOString() ?? "-"}`,
      `Route: ${trip.pickupAddress} -> ${trip.dropoffAddress}`,
      `Gross: ${(trip.fareTotalMinor / 100).toFixed(2)}`,
      `Platform Commission: ${(trip.commissionMinor / 100).toFixed(2)}`,
      `Tenant Revenue: ${(trip.tenantRevenueMinor / 100).toFixed(2)}`,
      `Rider Earnings: ${(riderEarningsMinor / 100).toFixed(2)}`
    ].join("\n");

    return new Response(receipt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"rider-receipt-${trip.id.slice(0, 8)}.txt\"`
      }
    });
  } catch (error) {
    return fail(error);
  }
}
