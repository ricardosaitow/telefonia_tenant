/**
 * TypingStore — in-memory store for typing indicators with auto-expire.
 *
 * Each entry expires after TTL_MS (5 seconds). If no new typing event
 * arrives, the entry is automatically removed and a stop_typing event
 * is emitted via the ChatEventBus.
 */

import { chatEventBus } from "./event-bus";

const TTL_MS = 5_000;

type TypingEntry = {
  name: string;
  timer: ReturnType<typeof setTimeout>;
};

/** Map<`${tenantId}:${chatId}:${membershipId}`, TypingEntry> */
const store = new Map<string, TypingEntry>();

function key(tenantId: string, chatId: string, membershipId: string): string {
  return `${tenantId}:${chatId}:${membershipId}`;
}

/**
 * Register a typing event. Resets the TTL timer.
 */
export function setTyping(
  tenantId: string,
  chatId: string,
  membershipId: string,
  name: string,
): void {
  const k = key(tenantId, chatId, membershipId);
  const existing = store.get(k);

  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    store.delete(k);
    chatEventBus.emit(tenantId, {
      type: "stop_typing",
      chatId,
      membershipId,
    });
  }, TTL_MS);

  store.set(k, { name, timer });

  chatEventBus.emit(tenantId, {
    type: "typing",
    chatId,
    membershipId,
    name,
  });
}

/**
 * Explicitly stop typing (e.g., when message is sent).
 */
export function clearTyping(tenantId: string, chatId: string, membershipId: string): void {
  const k = key(tenantId, chatId, membershipId);
  const existing = store.get(k);
  if (existing) {
    clearTimeout(existing.timer);
    store.delete(k);
    chatEventBus.emit(tenantId, {
      type: "stop_typing",
      chatId,
      membershipId,
    });
  }
}

/**
 * Get all currently typing users for a chat.
 */
export function getTypingUsers(
  tenantId: string,
  chatId: string,
): Array<{ membershipId: string; name: string }> {
  const prefix = `${tenantId}:${chatId}:`;
  const result: Array<{ membershipId: string; name: string }> = [];

  for (const [k, v] of store) {
    if (k.startsWith(prefix)) {
      const membershipId = k.slice(prefix.length);
      result.push({ membershipId, name: v.name });
    }
  }

  return result;
}
