import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assertSessionWithTenant } from "@/lib/rbac";

export default async function DashboardPage() {
  const ctx = await assertSessionWithTenant();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Olá, {ctx.account.name}. Esta é uma tela placeholder — sidebar, métricas e listas chegam
          em 8d/e.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card variant="solid" padding="default">
          <CardHeader>
            <CardTitle>Departamentos</CardTitle>
            <CardDescription>Em breve</CardDescription>
          </CardHeader>
        </Card>
        <Card variant="solid" padding="default">
          <CardHeader>
            <CardTitle>Agentes</CardTitle>
            <CardDescription>Em breve</CardDescription>
          </CardHeader>
        </Card>
        <Card variant="solid" padding="default">
          <CardHeader>
            <CardTitle>Conversas</CardTitle>
            <CardDescription>Em breve</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
