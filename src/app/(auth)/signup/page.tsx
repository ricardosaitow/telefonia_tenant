import { redirect } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/tenants");
  }

  return (
    <Card variant="glass" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Acesso ao portal — você poderá entrar em tenants depois.</CardDescription>
      </CardHeader>
      <SignupForm />
    </Card>
  );
}
