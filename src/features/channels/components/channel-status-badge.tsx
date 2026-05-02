import type { ChannelStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ChannelStatus, string> = {
  active: "bg-success/15 text-success",
  provisioning: "bg-warning/15 text-warning",
  error: "bg-destructive/15 text-destructive",
  disabled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<ChannelStatus, string> = {
  active: "Ativo",
  provisioning: "Provisionando",
  error: "Erro",
  disabled: "Desabilitado",
};

type ChannelStatusBadgeProps = {
  status: ChannelStatus;
  className?: string;
};

export function ChannelStatusBadge({ status, className }: ChannelStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
