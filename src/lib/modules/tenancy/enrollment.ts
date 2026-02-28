import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { hashPassword } from "@/lib/auth/password";
import { EnrollTenantInput } from "@/lib/validation/super-admin";

type EnrollActor = {
  userId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

export async function enrollTenant(actor: EnrollActor, input: EnrollTenantInput) {
  const passwordHash = await hashPassword(input.adminPassword);

  try {
    return await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: input.slug,
          name: input.name,
          appName: input.appName ?? input.name,
          supportEmail: input.supportEmail,
          supportPhone: input.supportPhone,
          primaryColor: input.primaryColor ?? "#0D9488",
          secondaryColor: input.secondaryColor ?? "#0F172A",
          customDomain: input.customDomain,
          platformCommissionBps: input.platformCommissionBps ?? 1500
        }
      });

      const tenantAdmin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.adminEmail,
          fullName: input.adminFullName,
          role: Role.tenant_admin,
          passwordHash
        }
      });

      await tx.pricingRule.create({
        data: {
          tenantId: tenant.id,
          name: "Default",
          baseFareMinor: 250,
          perKmMinor: 120,
          perMinuteMinor: 30,
          bookingFeeMinor: 100,
          minimumFareMinor: 500,
          surgeMultiplier: 1
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorRole: actor.role,
          action: "tenant.enrolled",
          entityType: "tenant",
          entityId: tenant.id,
          afterJson: {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantAdminUserId: tenantAdmin.id,
            tenantAdminEmail: tenantAdmin.email
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent
        }
      });

      return {
        tenant,
        tenantAdmin: {
          id: tenantAdmin.id,
          tenantId: tenantAdmin.tenantId,
          email: tenantAdmin.email,
          fullName: tenantAdmin.fullName,
          role: tenantAdmin.role
        }
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Tenant slug, custom domain, or admin email already exists", 409, "resource_conflict");
    }

    throw error;
  }
}
