import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { brandingSchema } from "@/lib/validation/tenant";
import { AppError } from "@/lib/errors/app-error";
import { updateTenantBranding } from "@/lib/modules/tenancy/branding";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.tenant_admin]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = brandingSchema.parse(body);
    const tenant = await updateTenantBranding(auth.tenantId, input);

    return ok(tenant);
  } catch (error) {
    return fail(error);
  }
}
