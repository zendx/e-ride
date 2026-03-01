import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";

type Params = {
  params: Promise<{ riderId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.tenant_admin]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { riderId } = await params;
    if (!riderId) throw new AppError("Rider ID is required", 400, "invalid_input");

    const rider = await prisma.riderProfile.findFirst({
      where: { id: riderId, tenantId: auth.tenantId },
      include: { user: true }
    });

    if (!rider) throw new AppError("Rider not found", 404, "resource_not_found");

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: rider.userId },
        data: { status: "active" },
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          role: true
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          actorRole: Role.tenant_admin,
          action: "tenant.rider_approved",
          entityType: "user",
          entityId: rider.userId,
          beforeJson: { status: rider.user.status },
          afterJson: { status: user.status },
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: request.headers.get("user-agent") ?? undefined
        }
      });

      return user;
    });

    return ok({
      riderId: rider.id,
      user: updated
    });
  } catch (error) {
    return fail(error);
  }
}
