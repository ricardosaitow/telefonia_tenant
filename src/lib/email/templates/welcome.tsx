import { Heading, Section, Text } from "@react-email/components";

import { cta, ctaSection, EmailLayout, heading, paragraph } from "./_layout";

/**
 * Email de boas-vindas — disparado em signup_success.
 */

type Props = {
  nome: string;
};

export function WelcomeEmail({ nome }: Props) {
  return (
    <EmailLayout preview={`Bem-vindo à telefonia.ia, ${nome}`}>
      <Heading style={heading}>Bem-vindo, {nome}.</Heading>

      <Text style={paragraph}>
        Sua conta foi criada. Escolha um plano para começar a configurar departamentos, agentes,
        canais e bases de conhecimento.
      </Text>

      <Section style={ctaSection}>
        <a href="https://app.telefonia.ia/login" style={cta}>
          Acessar o portal
        </a>
      </Section>
    </EmailLayout>
  );
}
