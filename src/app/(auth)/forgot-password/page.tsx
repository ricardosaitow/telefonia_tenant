import { redirect } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/tenants");
  }

  return (
    <Card variant="solid" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Esqueceu a senha?</CardTitle>
      </CardHeader>
      <ForgotPasswordForm />
    </Card>
  );
}
