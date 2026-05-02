/**
 * ChatEventBus — singleton SSE pub/sub via globalThis.
 *
 * V1: single-instance (VPS). Same pattern as Prisma client singleton.
 * V2: Redis pub/sub for multi-instance.
 *
 * Usage:
 *   chatEventBus.emit(tenantId, event)   — from Server Actions
 *   chatEventBus.subscribe(tenantId, membershipId, cb) — from SSE route
 */

import type { ChatEvent } from "@/features/chat/types";

type Subscriber = {
  membershipId: string;
  callback: (event: ChatEvent) => void;
};

class ChatEventBus {
  /** Map<tenantId, Set<Subscriber>> */
  private subscribers = new Map<string, Set<Subscriber>>();

  /**
   * Emit an event to all subscribers in a tenant.
   */
  emit(tenantId: string, event: ChatEvent): void {
    const subs = this.subscribers.get(tenantId);
    if (!subs) return;
    for (const sub of subs) {
      try {
        sub.callback(event);
      } catch {
        // Subscriber errored — will be cleaned up on disconnect
      }
    }
  }

  /**
   * Subscribe to events for a tenant. Returns unsubscribe function.
   */
  subscribe(
    tenantId: string,
    membershipId: string,
    callback: (event: ChatEvent) => void,
  ): () => void {
    if (!this.subscribers.has(tenantId)) {
      this.subscribers.set(tenantId, new Set());
    }
    const sub: Subscriber = { membershipId, callback };
    this.subscribers.get(tenantId)!.add(sub);

    return () => {
      const subs = this.subscribers.get(tenantId);
      if (subs) {
        subs.delete(sub);
        if (subs.size === 0) {
          this.subscribers.delete(tenantId);
        }
      }
    };
  }

  /**
   * Get count of online subscribers for a tenant (for debugging/status).
   */
  getOnlineCount(tenantId: string): number {
    return this.subscribers.get(tenantId)?.size ?? 0;
  }
}

// Singleton via globalThis (same pattern as Prisma client in dev)
const globalForChat = globalThis as unknown as { chatEventBus?: ChatEventBus };

export const chatEventBus = globalForChat.chatEventBus ?? new ChatEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForChat.chatEventBus = chatEventBus;
}
