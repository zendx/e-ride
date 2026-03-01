import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { riderIssueReportSchema } from "@/lib/validation/mobile";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const body = await request.json();
    const input = riderIssueReportSchema.parse(body);

    if (input.tripId) {
      const trip = await prisma.trip.findFirst({
        where: {
          id: input.tripId,
          tenantId: auth.tenantId,
          passenger: { userId: auth.userId }
        },
        select: { id: true, riderId: true }
      });
      if (!trip) throw new AppError("Trip not found for rider report", 404, "trip_not_found");
      if (input.driverId && trip.riderId && input.driverId !== trip.riderId) {
        throw new AppError("Driver does not match trip assignment", 409, "driver_trip_mismatch");
      }
    }

    if (input.paymentTransactionId) {
      const txn = await prisma.paymentTransaction.findFirst({
        where: {
          id: input.paymentTransactionId,
          tenantId: auth.tenantId,
          trip: { passenger: { userId: auth.userId } }
        },
        select: { id: true }
      });
      if (!txn) throw new AppError("Payment transaction not found", 404, "payment_not_found");
    }

    const priority = input.reportType === "failed_transaction" ? "high" : "normal";
    const prefix =
      input.reportType === "driver_report"
        ? "[DRIVER REPORT]"
        : input.reportType === "failed_transaction"
          ? "[FAILED TRANSACTION]"
          : "[DISPUTE]";

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: auth.tenantId,
        creatorId: auth.userId,
        subject: `${prefix} ${input.subject}`,
        body: input.details,
        priority,
        status: "open"
      },
      select: {
        id: true,
        subject: true,
        priority: true,
        status: true,
        createdAt: true
      }
    });

    await prisma.supportCommunication.create({
      data: {
        tenantId: auth.tenantId,
        ticketId: ticket.id,
        userId: auth.userId,
        channel: "chat",
        direction: "inbound",
        body: input.details,
        metadata: {
          reportType: input.reportType,
          tripId: input.tripId ?? null,
          driverId: input.driverId ?? null,
          paymentTransactionId: input.paymentTransactionId ?? null
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: auth.tenantId,
        actorUserId: auth.userId,
        actorRole: Role.passenger,
        action: "mobile.rider_issue_reported",
        entityType: "support_ticket",
        entityId: ticket.id,
        afterJson: {
          reportType: input.reportType,
          tripId: input.tripId ?? null,
          driverId: input.driverId ?? null,
          paymentTransactionId: input.paymentTransactionId ?? null
        }
      }
    });

    return ok({ ticket }, 201);
  } catch (error) {
    return fail(error);
  }
}
