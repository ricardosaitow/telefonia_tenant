import { Heading, Section, Text } from "@react-email/components";

import { cta, ctaSection, EmailLayout, heading, paragraph } from "./_layout";

/**
 * Email de reset de senha — disparado em forgot-password-action.
 * Token expira em 1h.
 */

type Props = {
  nome: string;
  resetUrl: string;
};

export function ResetPasswordEmail({ nome, resetUrl }: Props) {
  return (
    <EmailLayout preview={`Redefinir senha — telefonia.ia`}>
      <Heading style={heading}>Redefinir senha</Heading>

      <Text style={paragraph}>Olá, {nome}.</Text>

      <Text style={paragraph}>
        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para
        criar uma nova senha. Este link expira em 1 hora.
      </Text>

      <Section style={ctaSection}>
        <a href={resetUrl} style={cta}>
          Redefinir senha
        </a>
      </Section>

      <Text style={paragraph}>Se você não solicitou esta alteração, ignore este email.</Text>
    </EmailLayout>
  );
}
