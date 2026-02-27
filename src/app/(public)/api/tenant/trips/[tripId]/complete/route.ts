import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors/app-error";
import { captureTripPayment } from "@/lib/modules/payments/service";
import { updateTripStatus } from "@/lib/modules/trips/lifecycle";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.dispatcher, Role.tenant_admin]);

    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await context.params;

    await updateTripStatus(auth.tenantId, auth.userId, tripId, "completed", "dispatcher");
    const payment = await captureTripPayment(auth.tenantId, tripId, "card");

    return ok(payment);
  } catch (error) {
    return fail(error);
  }
}
