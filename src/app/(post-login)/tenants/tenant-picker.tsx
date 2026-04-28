"use client";

import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chooseTenantAction } from "@/features/auth/choose-tenant-action";

type Item = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  status: string;
};

type TenantPickerProps = {
  memberships: Item[];
  activeTenantId: string | null;
};

export function TenantPicker({ memberships, activeTenantId }: TenantPickerProps) {
  return (
    <ul className="flex flex-col gap-3">
      {memberships.map((m) => {
        const isActive = m.tenantId === activeTenantId;
        return (
          <li key={m.tenantId}>
            <Card variant="solid" padding="default" className="flex-row items-center gap-4">
              <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                <Building2 className="text-accent-light size-5" />
              </div>
              <div className="flex-1">
                <p className="font-display text-foreground text-base font-semibold tracking-tight">
                  {m.tenantName}
                </p>
                <p className="text-muted-foreground text-xs">
                  /{m.tenantSlug} · {m.role} · {m.status}
                </p>
              </div>
              <form action={chooseTenantAction}>
                <input type="hidden" name="tenantId" value={m.tenantId} />
                <Button type="submit" size="sm" variant={isActive ? "secondary" : "default"}>
                  {isActive ? "Continuar" : "Entrar"}
                </Button>
              </form>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
