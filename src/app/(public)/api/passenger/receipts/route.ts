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
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const passenger = await prisma.passengerProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!passenger) throw new AppError("Passenger profile not found", 404, "passenger_not_found");

    const trips = await prisma.trip.findMany({
      where: {
        tenantId: auth.tenantId,
        passengerId: passenger.id,
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
        payment: {
          select: {
            id: true,
            method: true,
            status: true,
            amountMinor: true,
            receiptUrl: true,
            createdAt: true
          }
        }
      }
    });

    const receipts = trips.map((trip) => ({
      ...trip,
      downloadUrl: `/api/passenger/receipts/${trip.id}/download`
    }));

    return ok({ receipts, count: receipts.length });
  } catch (error) {
    return fail(error);
  }
}
