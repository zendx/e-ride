import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { superAdminProfileUpdateSchema } from "@/lib/validation/super-admin";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) throw new AppError("User not found", 404, "user_not_found");

    return ok(user);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const body = await request.json();
    const input = superAdminProfileUpdateSchema.parse(body);

    const currentUser = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!currentUser) throw new AppError("User not found", 404, "user_not_found");

    if (input.newPassword) {
      const valid = await verifyPassword(input.currentPassword!, currentUser.passwordHash);
      if (!valid) throw new AppError("Current password is incorrect", 401, "invalid_credentials");
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        fullName: input.fullName?.trim() || undefined,
        email: input.email?.trim().toLowerCase() || undefined,
        passwordHash: input.newPassword ? await hashPassword(input.newPassword) : undefined
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: auth.userId,
        actorRole: Role.super_admin,
        action: "super_admin.profile_updated",
        entityType: "user",
        entityId: auth.userId,
        afterJson: {
          fullName: updated.fullName,
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
