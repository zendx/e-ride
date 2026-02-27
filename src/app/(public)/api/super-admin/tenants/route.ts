import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { enrollTenantSchema } from "@/lib/validation/super-admin";
import { enrollTenant } from "@/lib/modules/tenancy/enrollment";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
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

    return ok(tenants);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const body = await request.json();
    const input = enrollTenantSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const result = await enrollTenant(
      {
        userId: auth.userId,
        role: Role.super_admin,
        ipAddress: ip,
        userAgent
      },
      input
    );

    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
