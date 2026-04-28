import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { SignupForm } from "./signup-form";

export default function SignupPage() {
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
