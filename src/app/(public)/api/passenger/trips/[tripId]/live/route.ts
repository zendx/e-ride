import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { getLiveTripSnapshot } from "@/lib/modules/trips/live";

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

    const snapshot = await getLiveTripSnapshot(auth.tenantId, tripId);
    if (snapshot.trip.passengerId !== passenger.id) {
      throw new AppError("Trip does not belong to this passenger", 403, "trip_not_owned_by_passenger");
    }

    return ok(snapshot);
  } catch (error) {
    return fail(error);
  }
}
