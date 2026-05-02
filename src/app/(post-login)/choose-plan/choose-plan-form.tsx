"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Mail,
  MessageSquare,
  Mic,
  Rocket,
  X,
} from "lucide-react";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { choosePlanAction } from "@/features/plans/actions";
import { PLANS, type PlanSlug } from "@/features/plans/constants";
import { choosePlanSchema } from "@/features/plans/schemas";

/* ─── Plan metadata ────────────────────────────────────────────────────── */

const PLAN_META: Record<
  PlanSlug,
  {
    icon: typeof Rocket;
    tagline: string;
    features: { label: string; included: boolean }[];
  }
> = {
  demo: {
    icon: Rocket,
    tagline: "Tudo que você precisa para validar.",
    features: [
      { label: "1 agente IA configurável", included: true },
      { label: "1 ramal SIP + 1 trunk", included: true },
      { label: "Voz e WhatsApp", included: true },
      { label: "10 MB de base de conhecimento", included: true },
      { label: "Painel de métricas completo", included: true },
      { label: "Integrações externas", included: false },
      { label: "Membros adicionais", included: false },
    ],
  },
  pro: {
    icon: Crown,
    tagline: "Para equipes que precisam de mais.",
    features: [
      { label: "3 agentes IA configuráveis", included: true },
      { label: "5 ramais SIP + 2 trunks", included: true },
      { label: "Voz, WhatsApp e Email", included: true },
      { label: "100 MB de base de conhecimento", included: true },
      { label: "Até 5 membros na equipe", included: true },
      { label: "3 departamentos com roteamento", included: true },
      { label: "Integrações básicas (CRM, ERP)", included: true },
    ],
  },
  enterprise: {
    icon: Building2,
    tagline: "Sem limites. Sob medida.",
    features: [
      { label: "Agentes, ramais e trunks ilimitados", included: true },
      { label: "Todos os canais (Voz, WhatsApp, Email, API)", included: true },
      { label: "Base de conhecimento ilimitada", included: true },
      { label: "Equipe e departamentos ilimitados", included: true },
      { label: "Todas as integrações", included: true },
      { label: "SLA dedicado + onboarding", included: true },
      { label: "Suporte prioritário", included: true },
    ],
  },
};

function formatPrice(price: number | null): { main: string; decimal?: string; suffix?: string } {
  if (price === null) return { main: "Sob consulta" };
  if (price === 0) return { main: "R$ 0", suffix: "por 3 dias" };
  const reais = Math.floor(price / 100);
  return { main: `R$ ${reais.toLocaleString("pt-BR")}`, suffix: "/mês" };
}

/* ─── Component ────────────────────────────────────────────────────────── */

export function ChoosePlanForm({ accountName }: { accountName: string }) {
  const [lastResult, action, pending] = useActionState(choosePlanAction, undefined);
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>("demo");

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: choosePlanSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={action} className="flex flex-col gap-10">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      {/* Nome da empresa — centralizado, com contexto */}
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <Label htmlFor={fields.nomeTenant.id} className="text-center text-sm font-medium">
          Como se chama sua empresa, {accountName.split(" ")[0]}?
        </Label>
        <Input
          {...getInputProps(fields.nomeTenant, { type: "text" })}
          key={fields.nomeTenant.key}
          required={false}
          placeholder="Ex: Pekiart Consulting"
          autoComplete="organization"
          autoFocus
          className="h-12 text-center text-base"
        />
        {fields.nomeTenant.errors?.length ? (
          <p className="text-destructive text-center text-sm">
            {fields.nomeTenant.errors.join(" ")}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="planSlug" value={selectedPlan} />

      {/* Cards dos planos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {(Object.entries(PLANS) as [PlanSlug, (typeof PLANS)[PlanSlug]][]).map(([slug, plan]) => {
          const meta = PLAN_META[slug];
          const Icon = meta.icon;
          const price = formatPrice(plan.price);
          const isPro = slug === "pro";
          const isSelected = selectedPlan === slug;

          return (
            <div key={slug} className="relative flex flex-col">
              <div
                className={[
                  "bg-card flex flex-1 flex-col overflow-hidden rounded-lg border transition-all duration-200",
                  isPro ? "border-accent-light border-2" : "border-divider-strong",
                  isSelected && !isPro ? "border-accent-light border-2" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Header */}
                <div className="flex flex-col gap-5 p-6 pb-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "flex size-11 items-center justify-center rounded-lg",
                        isPro ? "bg-primary/15" : "bg-surface-2",
                      ].join(" ")}
                    >
                      <Icon className="text-accent-light size-5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-display text-foreground text-lg font-bold">
                        {plan.name}
                      </h3>
                      <p className="text-muted-foreground text-xs">{meta.tagline}</p>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-foreground text-4xl font-bold tracking-tight">
                      {price.main}
                    </span>
                    {price.suffix ? (
                      <span className="text-muted-foreground text-sm">{price.suffix}</span>
                    ) : null}
                  </div>

                  {/* Canais — visual com ícones */}
                  <div className="flex items-center gap-2">
                    {plan.channels.map((channel) => {
                      const channelConfig = {
                        voice: { icon: Mic, label: "Voz" },
                        whatsapp: { icon: MessageSquare, label: "WhatsApp" },
                        email: { icon: Mail, label: "Email" },
                        api: { icon: ArrowRight, label: "API" },
                      }[channel];
                      if (!channelConfig) return null;
                      const ChannelIcon = channelConfig.icon;
                      return (
                        <span
                          key={channel}
                          className="bg-surface-2 text-muted-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs"
                        >
                          <ChannelIcon className="size-3" />
                          {channelConfig.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-divider-strong mx-6 mt-5 border-t" />

                {/* Features */}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  {meta.features.map((f) => (
                    <div key={f.label} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check className="text-accent-light mt-0.5 size-4 shrink-0" />
                      ) : (
                        <X className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-40" />
                      )}
                      <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="p-6 pt-0">
                  {slug === "demo" ? (
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={pending}
                      onClick={() => setSelectedPlan("demo")}
                    >
                      {pending && isSelected ? (
                        "Criando sua empresa..."
                      ) : (
                        <>
                          Começar grátis
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  ) : slug === "enterprise" ? (
                    <Button variant="outline" size="lg" className="w-full" asChild>
                      <a href="mailto:contato@pekiart.com.br?subject=Enterprise%20telefonia.ia">
                        Fale com a gente
                        <ArrowRight className="size-4" />
                      </a>
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="lg" className="w-full" disabled>
                        Assinar Pro
                      </Button>
                      <p className="text-muted-foreground text-center text-xs">
                        Disponível em breve
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <p className="text-muted-foreground text-center text-xs">
        O plano Demo é gratuito por 3 dias. Sem cartão de crédito.
      </p>
    </form>
  );
}
