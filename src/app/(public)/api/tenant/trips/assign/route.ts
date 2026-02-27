import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { assignTripSchema } from "@/lib/validation/trip";
import { AppError } from "@/lib/errors/app-error";
import { assignTripByDispatcher } from "@/lib/modules/trips/service";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.dispatcher, Role.tenant_admin]);

    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = assignTripSchema.parse(body);
    const trip = await assignTripByDispatcher(auth.tenantId, auth.userId, input.tripId, input.riderId);

    return ok(trip);
  } catch (error) {
    return fail(error);
  }
}
