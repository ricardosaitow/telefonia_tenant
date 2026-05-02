import { Heading, Section, Text } from "@react-email/components";

import { cta, ctaSection, EmailLayout, heading, paragraph } from "./_layout";

/**
 * Email de convite pra membro se juntar a um tenant.
 * Token expira em 7 dias.
 */

type Props = {
  inviterName: string;
  tenantName: string;
  role: string;
  acceptUrl: string;
};

export function InviteMemberEmail({ inviterName, tenantName, role, acceptUrl }: Props) {
  return (
    <EmailLayout preview={`${inviterName} convidou você para ${tenantName}`}>
      <Heading style={heading}>Convite para {tenantName}</Heading>

      <Text style={paragraph}>
        {inviterName} convidou você para participar de <strong>{tenantName}</strong> como{" "}
        <strong>{role}</strong>.
      </Text>

      <Text style={paragraph}>
        Clique no botão abaixo para aceitar o convite. Este link expira em 7 dias.
      </Text>

      <Section style={ctaSection}>
        <a href={acceptUrl} style={cta}>
          Aceitar convite
        </a>
      </Section>

      <Text style={paragraph}>Se você não esperava este convite, ignore este email.</Text>
    </EmailLayout>
  );
}
