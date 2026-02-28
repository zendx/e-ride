import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { createAdminUserSchema } from "@/lib/validation/super-admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const admins = await prisma.user.findMany({
      where: { role: { in: [Role.super_admin, Role.support] }, tenantId: null },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return ok(admins);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const body = await request.json();
    const input = createAdminUserSchema.parse(body);

    const adminUser = await prisma.user.create({
      data: {
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        passwordHash: await hashPassword(input.password)
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: auth.userId,
        actorRole: Role.super_admin,
        action: "super_admin.admin_user_created",
        entityType: "user",
        entityId: adminUser.id,
        afterJson: {
          email: adminUser.email,
          role: adminUser.role
        },
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: request.headers.get("user-agent") ?? undefined
      }
    });

    return ok(adminUser, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(new AppError("Email already exists", 409, "resource_conflict"));
    }

    return fail(error);
  }
}
