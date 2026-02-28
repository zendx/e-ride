import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const safeCount = async (fn: () => Promise<number>) => {
      try {
        return await fn();
      } catch {
        return 0;
      }
    };

    const [tenantCount, pendingKycCount, activeTripCount, openComplaintCount] = await Promise.all([
      safeCount(() => prisma.tenant.count()),
      safeCount(() => prisma.kycDocument.count({ where: { status: "pending" } })),
      safeCount(() => prisma.trip.count({ where: { status: { in: ["requested", "assigned", "accepted", "in_progress"] } } })),
      safeCount(() => prisma.complaint.count({ where: { status: { in: ["open", "investigating"] } } }))
    ]);

    return ok({
      tenantCount,
      pendingKycCount,
      activeTripCount,
      openComplaintCount
    });
  } catch (error) {
    try {
      const auth = await getAuthContext(request);
      requireRole(auth.role as Role, [Role.super_admin]);
      return ok({
        tenantCount: 0,
        pendingKycCount: 0,
        activeTripCount: 0,
        openComplaintCount: 0
      });
    } catch (authError) {
      return fail(authError);
    }
  }
}
