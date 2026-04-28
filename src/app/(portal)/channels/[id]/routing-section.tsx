import { Bot, Building2, MoveRight, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteRoutingRuleAction } from "@/features/routing/delete-action";
import { listRoutingRulesByChannel, listRoutingTargets } from "@/features/routing/queries";
import { setDefaultRoutingRuleAction } from "@/features/routing/set-default-action";

import { CreateRoutingRuleForm } from "./create-routing-form";

type RoutingSectionProps = {
  activeTenantId: string;
  channelId: string;
  defaultRoutingRuleId: string | null;
  canManage: boolean;
};

/**
 * Server Component: lista routing_rules do channel + form inline pra criar
 * + actions inline (delete, set-default). Renderizado dentro da page do
 * channel detail.
 */
export async function RoutingSection({
  activeTenantId,
  channelId,
  defaultRoutingRuleId,
  canManage,
}: RoutingSectionProps) {
  const [rules, targets] = await Promise.all([
    listRoutingRulesByChannel(activeTenantId, channelId),
    listRoutingTargets(activeTenantId),
  ]);

  const noTargets = targets.departments.length === 0 && targets.agents.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">
          Roteamento
        </h2>
        <span className="text-muted-foreground text-xs">
          como conversa que entra neste canal chega num agente
        </span>
      </div>

      {rules.length === 0 ? (
        <Card variant="solid" padding="default">
          <p className="text-muted-foreground text-sm">
            Nenhuma regra cadastrada. Sem regra, o canal não roteia conversas.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => {
            const isDefault = rule.id === defaultRoutingRuleId;
            const TargetIcon = rule.targetDepartmentId ? Building2 : Bot;
            const targetName =
              rule.targetDepartment?.nome ?? rule.targetAgent?.nome ?? "(target removido)";
            const targetType = rule.targetDepartmentId ? "Departamento" : "Agente";

            return (
              <li key={rule.id}>
                <Card
                  variant="solid"
                  padding="default"
                  className="flex-row items-center gap-3 py-3"
                >
                  <MoveRight className="text-muted-foreground size-4" />
                  <TargetIcon className="text-accent-light size-4" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground truncate text-sm font-medium">{targetName}</p>
                      {isDefault ? (
                        <span className="text-accent-light bg-glass-bg rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          padrão
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs">direto · {targetType}</p>
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      {!isDefault ? (
                        <form action={setDefaultRoutingRuleAction}>
                          <input type="hidden" name="channelId" value={channelId} />
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Tornar padrão
                          </Button>
                        </form>
                      ) : (
                        <form action={setDefaultRoutingRuleAction}>
                          <input type="hidden" name="channelId" value={channelId} />
                          <input type="hidden" name="ruleId" value="" />
                          <Button type="submit" variant="ghost" size="sm">
                            Remover padrão
                          </Button>
                        </form>
                      )}
                      <DeleteRuleForm channelId={channelId} ruleId={rule.id} />
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        noTargets ? (
          <Card variant="solid" padding="default">
            <p className="text-muted-foreground text-sm">
              Crie pelo menos um departamento ou agente antes de adicionar regras de roteamento.
            </p>
          </Card>
        ) : (
          <Card variant="solid" padding="default" className="gap-3">
            <div className="flex items-center gap-2">
              <Plus className="text-muted-foreground size-4" />
              <h3 className="text-foreground text-sm font-medium">Adicionar regra</h3>
            </div>
            <CreateRoutingRuleForm
              channelId={channelId}
              departments={targets.departments}
              agents={targets.agents}
            />
          </Card>
        )
      ) : null}
    </div>
  );
}

function DeleteRuleForm({ channelId, ruleId }: { channelId: string; ruleId: string }) {
  return (
    <form action={deleteRoutingRuleAction}>
      <input type="hidden" name="id" value={ruleId} />
      <input type="hidden" name="channelId" value={channelId} />
      <Button type="submit" variant="ghost" size="sm" aria-label="Excluir regra">
        <Trash2 />
      </Button>
    </form>
  );
}
