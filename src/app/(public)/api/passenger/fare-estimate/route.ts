import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { passengerFareEstimateSchema } from "@/lib/validation/mobile";
import { calculateFare } from "@/lib/modules/trips/fare-engine";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = passengerFareEstimateSchema.parse(body);

    const [tenant, pricing] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: auth.tenantId } }),
      prisma.pricingRule.findFirst({
        where: { tenantId: auth.tenantId, isActive: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

    if (!tenant || !pricing) throw new AppError("Tenant pricing is not configured", 400, "pricing_missing");

    const fare = calculateFare(
      pricing,
      input.estimatedDistanceKm,
      input.estimatedDurationMin,
      tenant.platformCommissionBps
    );

    return ok({
      estimatedDistanceKm: input.estimatedDistanceKm,
      estimatedDurationMin: input.estimatedDurationMin,
      fare
    });
  } catch (error) {
    return fail(error);
  }
}
