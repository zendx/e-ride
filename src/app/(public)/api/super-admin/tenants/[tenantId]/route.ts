import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { superAdminTenantUpdateSchema } from "@/lib/validation/super-admin";

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
    const input = superAdminTenantUpdateSchema.parse(body);

    const current = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!current) throw new AppError("Tenant not found", 404, "resource_not_found");

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: input.name?.trim() || undefined,
        slug: input.slug?.trim().toLowerCase() || undefined,
        appName: input.appName?.trim() || undefined,
        status: input.status?.trim().toLowerCase() || undefined,
        supportEmail: input.supportEmail === null ? null : input.supportEmail?.trim().toLowerCase() || undefined,
        supportPhone: input.supportPhone === null ? null : input.supportPhone?.trim() || undefined,
        primaryColor: input.primaryColor || undefined,
        secondaryColor: input.secondaryColor || undefined,
        customDomain: input.customDomain === null ? null : input.customDomain?.trim().toLowerCase() || undefined,
        platformCommissionBps: input.platformCommissionBps
      },
      include: {
        _count: {
          select: {
            users: true,
            trips: true,
            complaints: true,
            tenantKycDocuments: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: auth.userId,
        actorRole: Role.super_admin,
        tenantId,
        action: "super_admin.tenant_updated",
        entityType: "tenant",
        entityId: tenantId,
        beforeJson: {
          name: current.name,
          slug: current.slug,
          appName: current.appName,
          status: current.status,
          supportEmail: current.supportEmail,
          supportPhone: current.supportPhone,
          primaryColor: current.primaryColor,
          secondaryColor: current.secondaryColor,
          customDomain: current.customDomain,
          platformCommissionBps: current.platformCommissionBps
        },
        afterJson: {
          name: updated.name,
          slug: updated.slug,
          appName: updated.appName,
          status: updated.status,
          supportEmail: updated.supportEmail,
          supportPhone: updated.supportPhone,
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
          customDomain: updated.customDomain,
          platformCommissionBps: updated.platformCommissionBps
        },
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: request.headers.get("user-agent") ?? undefined
      }
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(new AppError("Tenant slug or domain already exists", 409, "resource_conflict"));
    }

    return fail(error);
  }
}
