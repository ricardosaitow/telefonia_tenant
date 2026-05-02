import { notFound } from "next/navigation";

import { getChatById, getChatMessages, getChats } from "@/features/chat/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { ChatShell } from "../components/chat-shell";

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "chat:view");

  const [chats, chat, messages] = await Promise.all([
    getChats(ctx.activeTenantId, ctx.membership.id),
    getChatById(ctx.activeTenantId, id),
    getChatMessages(ctx.activeTenantId, id),
  ]);

  if (!chat) notFound();

  return (
    <ChatShell
      initialChats={chats}
      currentMembershipId={ctx.membership.id}
      currentAccountName={ctx.account.name}
      initialSelectedChatId={id}
      initialChatDetail={chat}
      initialMessages={messages}
    />
  );
}
