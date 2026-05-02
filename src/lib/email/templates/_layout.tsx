import { Body, Container, Head, Hr, Html, Preview, Text } from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Layout compartilhado pra todos os emails transacionais.
 *
 * Extraído do WelcomeEmail pra garantir aparência consistente.
 * Templates passam `preview` (Preview text) + `children` (corpo).
 */

type Props = {
  preview: string;
  children: ReactNode;
};

export function EmailLayout({ preview, children }: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {children}

          <Hr style={hr} />

          <Text style={footnote}>
            Você está recebendo este email porque tem uma conta em telefonia.ia. Se não reconhece
            esta atividade, responda este email para que possamos investigar.
          </Text>

          <Text style={signature}>— Equipe Pekiart</Text>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Estilos compartilhados (inline — regra de email client)
// ---------------------------------------------------------------------------

export const body: React.CSSProperties = {
  backgroundColor: "#f4f5f7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  margin: 0,
  padding: "32px 16px",
};

export const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
};

export const heading: React.CSSProperties = {
  color: "#0d1221",
  fontSize: "22px",
  fontWeight: 600,
  margin: "0 0 16px 0",
};

export const paragraph: React.CSSProperties = {
  color: "#2a2f45",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px 0",
};

export const ctaSection: React.CSSProperties = {
  margin: "24px 0",
  textAlign: "center" as const,
};

export const cta: React.CSSProperties = {
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
