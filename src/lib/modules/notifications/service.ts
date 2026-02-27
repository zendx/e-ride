import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

type NotificationInput = {
  channel: "email" | "sms" | "push";
  to: string;
  subject?: string;
  message: string;
};

type NotificationResult = NotificationInput & {
  success: true;
  provider: "log" | "resend";
  providerMessageId: string;
};

type NotificationProvider = {
  send(input: NotificationInput): Promise<NotificationResult>;
};

const logProvider: NotificationProvider = {
  async send(input) {
    const providerMessageId = randomUUID();

    logger.info(
      {
        provider: "log",
        channel: input.channel,
        to: input.to,
        providerMessageId
      },
      "Notification dispatched"
    );

    return {
      success: true,
      provider: "log",
      providerMessageId,
      ...input
    };
  }
};

const resendProvider: NotificationProvider = {
  async send(input) {
    if (input.channel !== "email") {
      throw new AppError("Resend supports email notifications only", 400, "notification_channel_unsupported");
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      throw new AppError("Resend provider is not configured", 500, "notification_provider_not_configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: input.subject ?? "CarryGo Notification",
        text: input.message
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new AppError("Notification provider request failed", 502, "notification_provider_error", {
        provider: "resend",
        status: response.status,
        body: responseText
      });
    }

    const body = (await response.json()) as { id?: string };

    return {
      success: true,
      provider: "resend",
      providerMessageId: body.id ?? randomUUID(),
      ...input
    };
  }
};

function getNotificationProvider(): NotificationProvider {
  const provider = (process.env.NOTIFICATION_PROVIDER ?? "log").toLowerCase();
  if (provider === "resend") return resendProvider;
  return logProvider;
}

export async function sendNotification(input: NotificationInput): Promise<NotificationResult> {
  return getNotificationProvider().send(input);
}
