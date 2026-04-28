import { Power, PowerOff, Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listAgentTools } from "@/features/knowledge/queries";
import { removeAgentToolAction, toggleAgentToolAction } from "@/features/tools/agent-tool-actions";

import { AddAgentToolForm } from "./add-tool-form";

type Props = {
  activeTenantId: string;
  agentId: string;
  canManage: boolean;
};

export async function ToolsSection({ activeTenantId, agentId, canManage }: Props) {
  const tools = await listAgentTools(activeTenantId, agentId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Wrench className="text-muted-foreground size-4" />
        <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">Tools</h2>
        <span className="text-muted-foreground text-xs">
          funções que o agente pode invocar (catálogo Pekiart + custom)
        </span>
      </div>

      {tools.length === 0 ? (
        <Card variant="solid" padding="default">
          <p className="text-muted-foreground text-sm">
            Nenhuma tool habilitada. Sem tools, agente só responde texto.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {tools.map((t) => (
            <li key={t.id}>
              <Card variant="solid" padding="default" className="flex-row items-center gap-3 py-3">
                <Wrench
                  className={`size-4 ${t.enabled ? "text-accent-light" : "text-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <code className="text-foreground text-sm">{t.toolKey}</code>
                  {!t.enabled ? (
                    <span className="text-muted-foreground bg-glass-bg ml-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      desativada
                    </span>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <form action={toggleAgentToolAction}>
                      <input type="hidden" name="agentId" value={agentId} />
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="enabled" value={t.enabled ? "false" : "true"} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        aria-label={t.enabled ? "Desativar" : "Ativar"}
                      >
                        {t.enabled ? <PowerOff /> : <Power />}
                      </Button>
                    </form>
                    <form action={removeAgentToolAction}>
                      <input type="hidden" name="agentId" value={agentId} />
                      <input type="hidden" name="id" value={t.id} />
                      <Button type="submit" variant="ghost" size="sm" aria-label="Remover">
                        <Trash2 />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canManage ? <AddAgentToolForm agentId={agentId} /> : null}
    </div>
  );
}
