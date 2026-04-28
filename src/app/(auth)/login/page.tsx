import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ signup?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { signup } = await searchParams;
  const showSignupSuccess = signup === "ok";

  return (
    <Card variant="glass" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta com email e senha.</CardDescription>
      </CardHeader>
      <LoginForm signupSuccess={showSignupSuccess} />
    </Card>
  );
}
