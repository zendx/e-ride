import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { supportTicketCreateSchema } from "@/lib/validation/mobile";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const tickets = await prisma.supportTicket.findMany({
      where: {
        tenantId: auth.tenantId,
        creatorId: auth.userId
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        subject: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        communications: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            channel: true,
            direction: true,
            body: true,
            createdAt: true
          }
        }
      }
    });

    return ok({ tickets, count: tickets.length });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = supportTicketCreateSchema.parse(body);

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: auth.tenantId,
        creatorId: auth.userId,
        subject: input.subject,
        body: input.body,
        priority: input.priority,
        status: "open"
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: auth.tenantId,
        actorUserId: auth.userId,
        actorRole: auth.role as Role,
        action: "mobile.support_ticket.created",
        entityType: "support_ticket",
        entityId: ticket.id,
        afterJson: {
          subject: ticket.subject,
          priority: ticket.priority
        }
      }
    });

    return ok(ticket, 201);
  } catch (error) {
    return fail(error);
  }
}
