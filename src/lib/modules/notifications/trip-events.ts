import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/modules/notifications/service";
import { logger } from "@/lib/logger";

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

async function getUserPushToken(userId: string) {
  const latest = await prisma.securityLog.findFirst({
    where: {
      userId,
      action: "mobile.push_token.registered"
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true }
  });

  const metadata = asObject(latest?.metadata);
  const token = metadata.token;
  return typeof token === "string" ? token : null;
}

export async function notifyTripUsers(input: {
  tenantId: string;
  userIds: string[];
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}) {
  const uniqueUserIds = Array.from(new Set(input.userIds.filter(Boolean)));

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const pushToken = await getUserPushToken(userId);
        if (!pushToken) return;

        const response = await sendNotification({
          channel: "push",
          to: pushToken,
          subject: input.title,
          message: input.message
        });

        await prisma.notificationLog.create({
          data: {
            tenantId: input.tenantId,
            userId,
            channel: "push",
            title: input.title,
            message: input.message,
            status: "sent",
            providerMessageId: response.providerMessageId,
            payloadJson: input.payload ?? {}
          }
        });
      } catch (error) {
        logger.warn({ error, tenantId: input.tenantId, userId }, "Trip notification delivery failed");
        await prisma.notificationLog.create({
          data: {
            tenantId: input.tenantId,
            userId,
            channel: "push",
            title: input.title,
            message: input.message,
            status: "failed",
            payloadJson: input.payload ?? {}
          }
        });
      }
    })
  );
}
