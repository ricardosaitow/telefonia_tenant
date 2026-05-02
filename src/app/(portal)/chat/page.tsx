import { getChats } from "@/features/chat/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { ChatShell } from "./components/chat-shell";

export default async function ChatPage() {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "chat:view");

  const chats = await getChats(ctx.activeTenantId, ctx.membership.id);

  return (
    <ChatShell
      initialChats={chats}
      currentMembershipId={ctx.membership.id}
      currentAccountName={ctx.account.name}
    />
  );
}
