import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * Email de boas-vindas — disparado em signup_success.
 *
 * React Email renderiza pra HTML via @react-email/render no
 * `client.emails.send({ react })` — Resend SDK chama internamente.
 *
 * Estilos inline (regra de email): cliente de email não suporta CSS
 * externo nem variáveis. Tipografia simples, contraste alto.
 */

type Props = {
  nome: string;
};

export function WelcomeEmail({ nome }: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Bem-vindo à telefonia.ia, {nome}</Preview>
      <Body style={body}>
        <Container style={container}>
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

          <Hr style={hr} />

          <Text style={footnote}>
            Você está recebendo este email porque criou uma conta em telefonia.ia. Se não foi você,
            responda este email para que possamos investigar.
          </Text>

          <Text style={signature}>— Equipe Pekiart</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f5f7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  margin: 0,
  padding: "32px 16px",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
};

const heading: React.CSSProperties = {
  color: "#0d1221",
  fontSize: "22px",
  fontWeight: 600,
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#2a2f45",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px 0",
};

const ctaSection: React.CSSProperties = {
  margin: "24px 0",
  textAlign: "center" as const,
};

const cta: React.CSSProperties = {
  backgroundColor: "#6366f1",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
};

const footnote: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 16px 0",
};

const signature: React.CSSProperties = {
  color: "#0d1221",
  fontSize: "13px",
  margin: 0,
};
