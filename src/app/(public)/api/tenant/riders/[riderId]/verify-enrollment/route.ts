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

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.tenant_admin]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { riderId } = await params;
    if (!riderId) throw new AppError("Rider ID is required", 400, "invalid_input");

    const rider = await prisma.riderProfile.findFirst({
      where: { id: riderId, tenantId: auth.tenantId },
      include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } }
    });
    if (!rider) throw new AppError("Rider not found", 404, "resource_not_found");

    await prisma.securityLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "tenant.driver_enrollment_verified",
        success: true,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: request.headers.get("user-agent") ?? undefined,
        metadata: {
          riderId: rider.id,
          riderUserId: rider.user.id,
          riderName: rider.user.fullName
        }
      }
    });

    return ok({
      riderId: rider.id,
      riderName: rider.user.fullName,
      verified: true
    });
  } catch (error) {
    return fail(error);
  }
}
