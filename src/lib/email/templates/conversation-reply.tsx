import { Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_layout";

/**
 * Template minimalista pra reply de suporte por email.
 * Sem heading pesado — parece email normal.
 */

type Props = {
  bodyText: string;
  senderName: string;
};

export function ConversationReplyEmail({ bodyText, senderName }: Props) {
  return (
    <EmailLayout preview={`Resposta de ${senderName}`}>
      <Text style={paragraph} dangerouslySetInnerHTML={{ __html: nl2br(bodyText) }} />
      <Text style={{ ...paragraph, fontWeight: 600, marginBottom: 0 }}>{senderName}</Text>
    </EmailLayout>
  );
}

function nl2br(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}
