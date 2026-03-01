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
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await context.params;
    const passenger = await prisma.passengerProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!passenger) throw new AppError("Passenger profile not found", 404, "passenger_not_found");

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, tenantId: auth.tenantId },
      select: {
        id: true,
        status: true,
        passengerId: true,
        fareSubtotalMinor: true,
        fareSurgeMinor: true,
        fareFeesMinor: true,
        discountMinor: true,
        fareTotalMinor: true,
        completedAt: true,
        payment: {
          select: {
            id: true,
            method: true,
            status: true,
            amountMinor: true,
            feeMinor: true,
            discountMinor: true,
            receiptUrl: true,
            createdAt: true
          }
        }
      }
    });
    if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
    if (trip.passengerId !== passenger.id) {
      throw new AppError("Trip does not belong to this passenger", 403, "trip_not_owned_by_passenger");
    }
    if (trip.status !== "completed") {
      throw new AppError("Receipt is available only for completed trips", 409, "trip_not_completed");
    }

    return ok({
      tripId: trip.id,
      completedAt: trip.completedAt,
      downloadUrl: `/api/passenger/receipts/${trip.id}/download`,
      fare: {
        subtotalMinor: trip.fareSubtotalMinor,
        surgeMinor: trip.fareSurgeMinor,
        feesMinor: trip.fareFeesMinor,
        discountMinor: trip.discountMinor,
        totalMinor: trip.fareTotalMinor
      },
      payment: trip.payment
    });
  } catch (error) {
    return fail(error);
  }
}
