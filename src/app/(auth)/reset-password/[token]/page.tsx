import { redirect } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/tenants");
  }

  const { token } = await params;

  return (
    <Card variant="solid" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
      </CardHeader>
      <ResetPasswordForm token={token} />
    </Card>
  );
}
