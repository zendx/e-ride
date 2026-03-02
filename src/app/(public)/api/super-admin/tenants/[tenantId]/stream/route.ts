import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { AppError } from "@/lib/errors/app-error";
import { fail } from "@/lib/http";
import { createRedisSubscriber } from "@/lib/redis/client";
import { requireRole } from "@/lib/auth/rbac";
import { getTenantOpsChannel } from "@/lib/modules/trips/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length).trim();

  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("accessToken")?.trim();
  if (fromQuery) return fromQuery;

  throw new AppError("Missing bearer token", 401, "unauthorized");
}

function sseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const token = resolveAccessToken(request);
    const payload = await verifyAccessToken(token);
    if (!payload.sub || !payload.role) throw new AppError("Invalid token payload", 401, "invalid_token");
    requireRole(payload.role as Role, [Role.super_admin]);

    const { tenantId } = await context.params;
    if (!tenantId) throw new AppError("Tenant ID is required", 400, "invalid_input");

    const channel = getTenantOpsChannel(tenantId);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const subscriber = createRedisSubscriber();
        let heartbeat: ReturnType<typeof setInterval> | undefined;

        const cleanup = async () => {
          try {
            if (heartbeat) clearInterval(heartbeat);
            await subscriber.unsubscribe(channel);
            subscriber.disconnect();
            controller.close();
          } catch {
            controller.close();
          }
        };

        request.signal.addEventListener("abort", () => {
          void cleanup();
        });

        controller.enqueue(
          encoder.encode(
            sseEvent("ready", {
              tenantId,
              timestamp: new Date().toISOString()
            })
          )
        );

        await subscriber.subscribe(channel);

        subscriber.on("message", (_incomingChannel, rawMessage) => {
          controller.enqueue(encoder.encode(sseEvent("tenant_event", { rawMessage })));
        });

        heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(sseEvent("heartbeat", { timestamp: new Date().toISOString() })));
        }, 15000);
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return fail(error);
  }
}
