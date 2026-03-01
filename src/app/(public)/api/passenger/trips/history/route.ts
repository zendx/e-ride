import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { tripHistoryQuerySchema } from "@/lib/validation/mobile";

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

    const url = new URL(request.url);
    const query = tripHistoryQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined
    });

    const trips = await prisma.trip.findMany({
      where: {
        tenantId: auth.tenantId,
        passengerId: passenger.id,
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { requestedAt: "desc" },
      take: query.limit,
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        requestedAt: true,
        completedAt: true,
        cancelledAt: true,
        cancelReason: true,
        fareTotalMinor: true,
        rider: {
          select: {
            user: {
              select: {
                fullName: true
              }
            },
            vehicleType: true,
            vehiclePlate: true
          }
        }
      }
    });

    return ok({ trips, count: trips.length });
  } catch (error) {
    return fail(error);
  }
}
