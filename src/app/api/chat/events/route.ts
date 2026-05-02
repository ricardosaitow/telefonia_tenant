/**
 * SSE endpoint for real-time chat events.
 *
 * GET /api/chat/events
 *
 * Client connects via EventSource. Server pushes ChatEvent objects
 * as `data: JSON\n\n` lines. Connection is per-tenant, per-membership.
 *
 * Heartbeat every 30s to keep connection alive through proxies.
 */

import type { ChatEvent } from "@/features/chat/types";
import { chatEventBus } from "@/lib/chat/event-bus";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET() {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "chat:view");

  const tenantId = ctx.activeTenantId;
  const membershipId = ctx.membership.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: ChatEvent) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed — unsubscribe will handle cleanup
        }
      }

      // Subscribe to tenant events
      const unsubscribe = chatEventBus.subscribe(tenantId, membershipId, send);

      // Emit user_status online
      chatEventBus.emit(tenantId, {
        type: "user_status",
        membershipId,
        status: "online",
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup on close (AbortSignal is checked by the runtime)
      // The ReadableStream cancel callback fires when client disconnects
      const originalCancel = controller.close.bind(controller);
      void originalCancel; // TS unused — cleanup is via pull returning

      // Store cleanup refs for cancel
      (controller as unknown as Record<string, unknown>)._chatCleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
        chatEventBus.emit(tenantId, {
          type: "user_status",
          membershipId,
          status: "offline",
        });
      };
    },
    cancel(controller) {
      const cleanup = (controller as unknown as Record<string, unknown>)?._chatCleanup;
      if (typeof cleanup === "function") {
        (cleanup as () => void)();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
