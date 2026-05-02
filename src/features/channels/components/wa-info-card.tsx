import { MessageCircle, Phone, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelStatusBadge } from "@/features/channels/components/channel-status-badge";

type WaInfoCardProps = {
  identificador: string;
  waPushname: string | null;
  waWid: string | null;
};

export function WaInfoCard({ identificador, waPushname, waWid }: WaInfoCardProps) {
  return (
    <Card variant="solid" padding="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="text-accent-light size-5" />
          WhatsApp conectado
          <ChannelStatusBadge status="active" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4" />
            <dt className="text-muted-foreground">Número:</dt>
            <dd className="text-foreground font-medium">{identificador}</dd>
          </div>
          {waPushname && (
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground size-4" />
              <dt className="text-muted-foreground">Nome:</dt>
              <dd className="text-foreground font-medium">{waPushname}</dd>
            </div>
          )}
          {waWid && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <MessageCircle className="text-muted-foreground size-4" />
              <dt className="text-muted-foreground">WID:</dt>
              <dd className="text-foreground font-mono text-xs">{waWid}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
