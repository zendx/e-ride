import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { passengerRegistrationSchema } from "@/lib/validation/mobile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = passengerRegistrationSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
      select: { id: true, slug: true, name: true, status: true }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "resource_not_found");
    if (tenant.status !== "active") throw new AppError("Tenant is not active", 403, "tenant_inactive");

    const created = await prisma.$transaction(async (tx) => {
      const fullName = [input.firstName.trim(), input.middleName?.trim(), input.lastName.trim()]
        .filter(Boolean)
        .join(" ");

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          fullName,
          email: input.email.trim().toLowerCase(),
          passwordHash: await hashPassword(input.password),
          phoneNumber: input.phoneNumber?.trim() || undefined,
          role: Role.passenger,
          status: "active"
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true
        }
      });

      const passengerProfile = await tx.passengerProfile.create({
        data: {
          tenantId: tenant.id,
          userId: user.id
        },
        select: {
          id: true,
          rating: true,
          walletBalanceMinor: true
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: user.id,
          actorRole: Role.passenger,
          action: "passenger.registered",
          entityType: "user",
          entityId: user.id,
          afterJson: {
            tenantSlug: tenant.slug,
            passengerProfileId: passengerProfile.id
          },
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: request.headers.get("user-agent") ?? undefined
        }
      });

      return { user, passengerProfile };
    });

    return ok({
      tenant,
      ...created,
      message: "Registration successful. You can now log in."
    }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(new AppError("Email already exists", 409, "resource_conflict"));
    }
    return fail(error);
  }
}
