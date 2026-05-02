import { Heading, Text } from "@react-email/components";

import { EmailLayout, heading, paragraph } from "./_layout";

/**
 * Notificação de segurança — senha alterada com sucesso.
 * Sem CTA — só aviso pro usuário ficar ciente.
 */

type Props = {
  nome: string;
};

export function PasswordChangedEmail({ nome }: Props) {
  return (
    <EmailLayout preview={`Sua senha foi alterada — telefonia.ia`}>
      <Heading style={heading}>Senha alterada</Heading>

      <Text style={paragraph}>Olá, {nome}.</Text>

      <Text style={paragraph}>
        Sua senha foi alterada com sucesso. Se você não fez essa alteração, entre em contato
        imediatamente respondendo este email.
      </Text>
    </EmailLayout>
  );
}
