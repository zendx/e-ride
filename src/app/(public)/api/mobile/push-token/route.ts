import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { pushTokenSchema } from "@/lib/validation/mobile";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = pushTokenSchema.parse(body);

    await prisma.securityLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "mobile.push_token.registered",
        success: true,
        metadata: {
          token: input.token,
          platform: input.platform,
          appVersion: input.appVersion
        }
      }
    });

    return ok({ registered: true });
  } catch (error) {
    return fail(error);
  }
}
