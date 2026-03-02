import { NextRequest } from "next/server";
import { createRedisSubscriber } from "@/lib/redis/client";
import { getLiveTripSnapshot } from "@/lib/modules/trips/live";
import { getTripChannel } from "@/lib/modules/trips/realtime";
import { logger } from "@/lib/logger";

type TripStreamParams = {
  request: NextRequest;
  tenantId: string;
  tripId: string;
};

function sseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function createTripEventStreamResponse({ request, tenantId, tripId }: TripStreamParams) {
  const encoder = new TextEncoder();
  const channel = getTripChannel(tenantId, tripId);

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
        } catch (error) {
          logger.warn({ error, tenantId, tripId }, "Trip stream cleanup failed");
        }
      };

      request.signal.addEventListener("abort", () => {
        void cleanup();
      });

      try {
        const initial = await getLiveTripSnapshot(tenantId, tripId);
        controller.enqueue(encoder.encode(sseEvent("snapshot", initial)));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            sseEvent("error", {
              message: "Unable to load initial snapshot"
            })
          )
        );
      }

      await subscriber.subscribe(channel);

      subscriber.on("message", (_incomingChannel, rawMessage) => {
        try {
          const parsed = JSON.parse(rawMessage) as Record<string, unknown>;
          controller.enqueue(encoder.encode(sseEvent("trip_event", parsed)));
        } catch {
          controller.enqueue(
            encoder.encode(
              sseEvent("trip_event", {
                event: "unknown",
                raw: rawMessage
              })
            )
          );
        }
      });

      heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            sseEvent("heartbeat", {
              tripId,
              timestamp: new Date().toISOString()
            })
          )
        );
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
}
