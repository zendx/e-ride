import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";
import { tripChatMessageSchema } from "@/lib/validation/mobile";
import { publishTripEvent } from "@/lib/modules/trips/realtime";

type Params = {
  params: Promise<{ tripId: string }>;
};

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

async function assertTripAccess(tenantId: string, userId: string, role: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, tenantId },
    select: {
      id: true,
      passenger: { select: { userId: true } },
      rider: { select: { userId: true } }
    }
  });
  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
  if (role === "passenger" && trip.passenger.userId !== userId) {
    throw new AppError("Trip does not belong to this passenger", 403, "trip_not_owned_by_passenger");
  }
  if (role === "rider" && trip.rider?.userId !== userId) {
    throw new AppError("Rider is not assigned to this trip", 403, "trip_not_assigned_to_rider");
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.rider, Role.passenger]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const { tripId } = await params;
    await assertTripAccess(auth.tenantId, auth.userId, auth.role, tripId);

    const logs = await prisma.securityLog.findMany({
      where: {
        tenantId: auth.tenantId,
        action: "mobile.trip_chat.message"
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        metadata: true,
        createdAt: true
      }
    });

    const messages = logs
      .map((log) => {
        const metadata = asObject(log.metadata);
        return {
          id: log.id,
          tripId: metadata.tripId,
          senderRole: metadata.senderRole,
          body: metadata.body,
          createdAt: log.createdAt
        };
      })
      .filter((message) => message.tripId === tripId);

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

    const { tripId } = await params;
    await assertTripAccess(auth.tenantId, auth.userId, auth.role, tripId);

    const body = await request.json();
    const input = tripChatMessageSchema.parse(body);

    const message = await prisma.securityLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "mobile.trip_chat.message",
        success: true,
        metadata: {
          tripId,
          senderRole: auth.role,
          body: input.body
        }
      }
    });

    await publishTripEvent(auth.tenantId, tripId, "trip.chat_message", {
      senderRole: auth.role,
      body: input.body
    });

    return ok(message, 201);
  } catch (error) {
    return fail(error);
  }
}
