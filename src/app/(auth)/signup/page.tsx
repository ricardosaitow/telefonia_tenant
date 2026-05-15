import { redirect } from "next/navigation";

/**
 * /signup redireciona pro Logto com InteractionMode=signUp (abre direto na
 * tela de cadastro). Fluxo controlado inteiramente pelo Logto desde Fase 3
 * do plano [[sso-pekiart-logto]].
 */
export default function SignUpPage() {
  redirect("/api/logto/sign-up");
}
