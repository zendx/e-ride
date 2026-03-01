import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { mobilePreferencesSchema } from "@/lib/validation/mobile";

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const latest = await prisma.securityLog.findFirst({
      where: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "mobile.preferences.updated"
      },
      orderBy: { createdAt: "desc" },
      select: { metadata: true, createdAt: true }
    });

    return ok({
      preferences: asObject(latest?.metadata),
      updatedAt: latest?.createdAt ?? null
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = mobilePreferencesSchema.parse(body);

    await prisma.securityLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "mobile.preferences.updated",
        success: true,
        metadata: input
      }
    });

    return ok({ saved: true, preferences: input });
  } catch (error) {
    return fail(error);
  }
}
