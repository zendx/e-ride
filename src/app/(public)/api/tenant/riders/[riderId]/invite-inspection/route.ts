import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";

const inviteSchema = z.object({
  channel: z.enum(["email", "sms"]),
  scheduledAt: z.string().trim().min(4).max(120).optional(),
  note: z.string().trim().min(3).max(500).optional()
});

type Params = {
  params: Promise<{ riderId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.tenant_admin]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { riderId } = await params;
    if (!riderId) throw new AppError("Rider ID is required", 400, "invalid_input");

    const body = await request.json().catch(() => ({}));
    const input = inviteSchema.parse(body);

    const rider = await prisma.riderProfile.findFirst({
      where: { id: riderId, tenantId: auth.tenantId },
      include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } }
    });
    if (!rider) throw new AppError("Rider not found", 404, "resource_not_found");

    const verified = await prisma.securityLog.findFirst({
      where: {
        tenantId: auth.tenantId,
        action: "tenant.driver_enrollment_verified",
        metadata: {
          path: ["riderId"],
          equals: rider.id
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!verified) {
      throw new AppError("Verify driver enrollment before sending inspection invite", 409, "driver_enrollment_not_verified");
    }

    const target = input.channel === "email" ? rider.user.email : rider.user.phoneNumber;
    if (!target) {
      throw new AppError(`No ${input.channel === "email" ? "email" : "phone number"} available for this driver`, 409, "driver_contact_missing");
    }

    const message = input.note?.trim() ||
      `Hello ${rider.user.fullName}, your vehicle inspection invite is ready. ${input.scheduledAt ? `Scheduled: ${input.scheduledAt}.` : "Please contact support for schedule details."}`;

    const notification = await prisma.notificationLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: rider.user.id,
        channel: input.channel === "email" ? "email" : "sms",
        title: "Vehicle Inspection Invite",
        message,
        status: "queued",
        payloadJson: {
          target,
          riderId: rider.id,
          scheduledAt: input.scheduledAt ?? null
        }
      },
      select: {
        id: true,
        channel: true,
        status: true,
        createdAt: true
      }
    });

    await prisma.securityLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "tenant.driver_inspection_invited",
        success: true,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: request.headers.get("user-agent") ?? undefined,
        metadata: {
          riderId: rider.id,
          riderUserId: rider.user.id,
          channel: input.channel,
          target,
          scheduledAt: input.scheduledAt ?? null
        }
      }
    });

    return ok({
      riderId: rider.id,
      invited: true,
      notification
    });
  } catch (error) {
    return fail(error);
  }
}
