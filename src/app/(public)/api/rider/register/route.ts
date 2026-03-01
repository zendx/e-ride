import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { riderRegistrationSchema } from "@/lib/validation/mobile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = riderRegistrationSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
      select: { id: true, slug: true, name: true, status: true }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "resource_not_found");
    if (tenant.status !== "active") throw new AppError("Tenant is not active", 403, "tenant_inactive");

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          passwordHash: await hashPassword(input.password),
          phoneNumber: input.phoneNumber?.trim() || undefined,
          role: Role.rider,
          status: "pending"
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true
        }
      });

      const riderProfile = await tx.riderProfile.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          licenseNumber: input.licenseNumber.trim(),
          vehicleType: input.vehicleType.trim(),
          vehiclePlate: input.vehiclePlate.trim(),
          vehicleMake: input.vehicleMake?.trim() || undefined,
          vehicleModel: input.vehicleModel?.trim() || undefined,
          vehicleColor: input.vehicleColor?.trim() || undefined,
          availability: "offline"
        },
        select: {
          id: true,
          vehicleType: true,
          vehiclePlate: true,
          availability: true
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: user.id,
          actorRole: Role.rider,
          action: "rider.registered",
          entityType: "user",
          entityId: user.id,
          afterJson: {
            tenantSlug: tenant.slug,
            riderProfileId: riderProfile.id
          },
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: request.headers.get("user-agent") ?? undefined
        }
      });

      return { user, riderProfile };
    });

    return ok({
      tenant,
      ...created,
      message: "Registration submitted. Await tenant approval before going online."
    }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(new AppError("Email already exists", 409, "resource_conflict"));
    }
    return fail(error);
  }
}
