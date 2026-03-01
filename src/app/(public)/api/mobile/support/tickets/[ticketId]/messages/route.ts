import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { supportTicketMessageSchema } from "@/lib/validation/mobile";

type Params = {
  params: Promise<{ ticketId: string }>;
};

async function assertTicketOwnership(tenantId: string, userId: string, ticketId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      tenantId,
      creatorId: userId
    },
    select: { id: true }
  });
  if (!ticket) throw new AppError("Support ticket not found", 404, "support_ticket_not_found");
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { ticketId } = await params;
    await assertTicketOwnership(auth.tenantId, auth.userId, ticketId);

    const messages = await prisma.supportCommunication.findMany({
      where: {
        tenantId: auth.tenantId,
        ticketId
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        channel: true,
        direction: true,
        body: true,
        createdAt: true
      }
    });

    return ok({ messages, count: messages.length });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { ticketId } = await params;
    await assertTicketOwnership(auth.tenantId, auth.userId, ticketId);

    const body = await request.json();
    const input = supportTicketMessageSchema.parse(body);

    const message = await prisma.supportCommunication.create({
      data: {
        tenantId: auth.tenantId,
        ticketId,
        userId: auth.userId,
        channel: "chat",
        direction: "inbound",
        body: input.body
      }
    });

    return ok(message, 201);
  } catch (error) {
    return fail(error);
  }
}
