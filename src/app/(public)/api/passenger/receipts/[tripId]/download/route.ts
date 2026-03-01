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
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await params;
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
        pickupAddress: true,
        dropoffAddress: true,
        completedAt: true,
        fareTotalMinor: true
      }
    });
    if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
    if (trip.passengerId !== passenger.id) throw new AppError("Trip does not belong to this passenger", 403, "trip_not_owned_by_passenger");
    if (trip.status !== "completed") throw new AppError("Receipt is available only for completed trips", 409, "trip_not_completed");

    const receipt = [
      "CarryGo Passenger Receipt",
      `Trip: ${trip.id}`,
      `Completed: ${trip.completedAt?.toISOString() ?? "-"}`,
      `Route: ${trip.pickupAddress} -> ${trip.dropoffAddress}`,
      `Total: ${(trip.fareTotalMinor / 100).toFixed(2)}`
    ].join("\n");

    return new Response(receipt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"passenger-receipt-${trip.id.slice(0, 8)}.txt\"`
      }
    });
  } catch (error) {
    return fail(error);
  }
}
