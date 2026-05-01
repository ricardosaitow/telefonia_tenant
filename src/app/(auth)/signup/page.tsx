import { redirect } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/tenants");
  }

  return (
    <Card variant="solid" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
      </CardHeader>
      <SignupForm />
    </Card>
  );
}
