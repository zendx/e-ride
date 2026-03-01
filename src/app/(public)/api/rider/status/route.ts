import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { riderStatusSchema } from "@/lib/validation/trip";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider]);

    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = riderStatusSchema.parse(body);

    const rider = await prisma.riderProfile.findFirst({
      where: { tenantId: auth.tenantId, userId: auth.userId }
    });

    if (!rider) throw new AppError("Rider profile not found", 404, "rider_not_found");
    const riderUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { status: true }
    });
    if (!riderUser || riderUser.status !== "active") {
      throw new AppError("Rider approval pending. Await tenant approval.", 403, "rider_not_approved");
    }

    const updated = await prisma.riderProfile.update({
      where: { id: rider.id },
      data: {
        availability: input.availability,
        lat: input.lat,
        lng: input.lng
      }
    });

    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
