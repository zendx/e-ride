import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { tripRatingSchema } from "@/lib/validation/mobile";
import { passengerRatesRider } from "@/lib/modules/trips/ratings";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await context.params;
    const body = await request.json();
    const input = tripRatingSchema.parse(body);

    const updated = await passengerRatesRider({
      tenantId: auth.tenantId,
      userId: auth.userId,
      tripId,
      rating: input.rating,
      feedback: input.feedback
    });

    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
