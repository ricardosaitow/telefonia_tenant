import { redirect } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ signup?: string; reset?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/tenants");
  }

  const { signup, reset, next } = await searchParams;
  const showSignupSuccess = signup === "ok";
  const showResetSuccess = reset === "ok";

  return (
    <Card variant="solid" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Bem-vindo de volta</CardTitle>
      </CardHeader>
      <LoginForm signupSuccess={showSignupSuccess} resetSuccess={showResetSuccess} next={next} />
    </Card>
  );
}
