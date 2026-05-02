import { redirect } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";

import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/tenants");
  }

  const { next } = await searchParams;

  return (
    <Card variant="solid" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
      </CardHeader>
      <SignupForm next={next} />
    </Card>
  );
}
