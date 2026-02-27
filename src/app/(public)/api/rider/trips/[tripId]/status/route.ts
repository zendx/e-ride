import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { tripStatusUpdateSchema } from "@/lib/validation/trip";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db";
import { updateTripStatus } from "@/lib/modules/trips/lifecycle";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);

    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await context.params;
    const body = await request.json();
    const input = tripStatusUpdateSchema.parse(body);

    const rider = await prisma.riderProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      select: { id: true }
    });
    if (!rider) throw new AppError("Rider not found", 404, "rider_not_found");

    const updated = await updateTripStatus(auth.tenantId, auth.userId, tripId, input.status, "rider");
    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
