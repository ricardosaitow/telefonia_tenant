"use client";

import { Power, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { retryProvisionAction } from "@/features/channels/retry-provision-action";
import { toggleChannelStatusAction } from "@/features/channels/toggle-status-action";

type RetryProvisionButtonProps = {
  channelId: string;
};

export function RetryProvisionButton({ channelId }: RetryProvisionButtonProps) {
  return (
    <form action={retryProvisionAction}>
      <input type="hidden" name="id" value={channelId} />
      <Button type="submit" variant="outline" size="sm">
        <RefreshCw />
        Tentar novamente
      </Button>
    </form>
  );
}

type ToggleStatusButtonProps = {
  channelId: string;
  currentStatus: "active" | "disabled";
};

export function ToggleStatusButton({ channelId, currentStatus }: ToggleStatusButtonProps) {
  const isActive = currentStatus === "active";

  return (
    <form action={toggleChannelStatusAction}>
      <input type="hidden" name="id" value={channelId} />
      <Button type="submit" variant={isActive ? "outline" : "default"} size="sm">
        <Power />
        {isActive ? "Desativar" : "Ativar"}
      </Button>
    </form>
  );
}
