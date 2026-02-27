import { Role } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { createTripSchema } from "@/lib/validation/trip";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { createPassengerTrip } from "@/lib/modules/trips/service";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.passenger]);

    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    await enforceRateLimit(`rl:trip:create:${auth.tenantId}:${auth.userId}`, 30, 60);

    const profile = await prisma.passengerProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });

    if (!profile) throw new AppError("Passenger profile not found", 404, "passenger_not_found");

    const body = await request.json();
    const input = createTripSchema.parse(body);
    const trip = await createPassengerTrip(auth.tenantId, profile.id, input);

    return ok(trip, 201);
  } catch (error) {
    return fail(error);
  }
}
