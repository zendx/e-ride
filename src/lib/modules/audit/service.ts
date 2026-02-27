import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

type CreateAuditInput = {
  tenantId?: string | null;
  actorUserId?: string;
  actorRole?: Role;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function createAuditLog(input: CreateAuditInput) {
  return prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.beforeJson as any,
      afterJson: input.afterJson as any,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}
