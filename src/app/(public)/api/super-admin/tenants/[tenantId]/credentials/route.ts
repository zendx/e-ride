import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { superAdminTenantCredentialsUpdateSchema } from "@/lib/validation/super-admin";

type Params = {
  params: Promise<{ tenantId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const { tenantId } = await params;
    if (!tenantId) throw new AppError("Tenant ID is required", 400, "invalid_input");

    const body = await request.json();
    const input = superAdminTenantCredentialsUpdateSchema.parse(body);

    const adminUser = input.adminUserId
      ? await prisma.user.findFirst({
        where: { id: input.adminUserId, tenantId, role: Role.tenant_admin },
        select: { id: true, email: true, fullName: true, role: true, status: true }
      })
      : await prisma.user.findFirst({
        where: { tenantId, role: Role.tenant_admin },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, fullName: true, role: true, status: true }
      });

    if (!adminUser) throw new AppError("Tenant admin account not found", 404, "resource_not_found");

    const updated = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        email: input.email?.trim().toLowerCase() || undefined,
        passwordHash: input.newPassword ? await hashPassword(input.newPassword) : undefined
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: auth.userId,
        actorRole: Role.super_admin,
        tenantId,
        action: "super_admin.tenant_admin_credentials_updated",
        entityType: "user",
        entityId: updated.id,
        beforeJson: {
          email: adminUser.email
        },
        afterJson: {
          email: updated.email,
          passwordChanged: Boolean(input.newPassword)
        },
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: request.headers.get("user-agent") ?? undefined
      }
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(new AppError("Email already exists", 409, "resource_conflict"));
    }

    return fail(error);
  }
}
