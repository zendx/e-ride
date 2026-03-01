import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";

type Params = {
  params: Promise<{ ticketId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { ticketId } = await params;
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        tenantId: auth.tenantId,
        creatorId: auth.userId
      },
      select: { id: true, subject: true, status: true }
    });
    if (!ticket) throw new AppError("Support ticket not found", 404, "support_ticket_not_found");

    const simulatedReply = await prisma.supportCommunication.create({
      data: {
        tenantId: auth.tenantId,
        ticketId: ticket.id,
        channel: "chat",
        direction: "outbound",
        body: `Support update: we are reviewing your issue "${ticket.subject}".`
      }
    });

    return ok(simulatedReply, 201);
  } catch (error) {
    return fail(error);
  }
}
