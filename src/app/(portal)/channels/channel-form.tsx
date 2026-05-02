"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createChannelAction } from "@/features/channels/create-action";
import {
  CHANNEL_TYPE_LABEL,
  channelInputSchema,
  updateChannelInputSchema,
} from "@/features/channels/schemas";
import { updateChannelAction } from "@/features/channels/update-action";

type ChannelType = keyof typeof CHANNEL_TYPE_LABEL;

const TYPE_HINTS: Record<ChannelType, string> = {
  voice_did: "DID em formato E.164 (ex.: +5511999999999)",
  whatsapp: "Será preenchido automaticamente após escanear o QR code",
  email: "Endereço completo (ex.: atendimento@empresa.com)",
  webchat: "Identificador interno (ex.: site-principal)",
};

const SIP_TRANSPORT_OPTIONS = [
  { value: "udp", label: "UDP" },
  { value: "tcp", label: "TCP" },
  { value: "tls", label: "TLS" },
] as const;

type ChannelFormProps = {
  mode: "create" | "edit";
  defaultValues?: {
    id: string;
    tipo: ChannelType;
    identificador: string;
    nomeAmigavel: string;
    sipHost?: string | null;
    sipPort?: number | null;
    sipTransport?: string | null;
    sipUsername?: string | null;
    sipRegister?: boolean | null;
    pbxGatewayUuid?: string | null;
    waBridgeUrl?: string | null;
  };
};

export function ChannelForm({ mode, defaultValues }: ChannelFormProps) {
  const action = mode === "create" ? createChannelAction : updateChannelAction;
  const schema = mode === "create" ? channelInputSchema : updateChannelInputSchema;

  const [lastResult, formAction, pending] = useActionState(action, undefined);
  const [selectedTipo, setSelectedTipo] = useState<string>(defaultValues?.tipo ?? "");

  const [form, fields] = useForm({
    lastResult,
    defaultValue: defaultValues
      ? {
          tipo: defaultValues.tipo,
          identificador: defaultValues.identificador,
          nomeAmigavel: defaultValues.nomeAmigavel,
          sipHost: defaultValues.sipHost ?? "",
          sipPort: defaultValues.sipPort ?? 5060,
          sipTransport: defaultValues.sipTransport ?? "udp",
          sipUsername: defaultValues.sipUsername ?? "",
          sipPassword: "",
          sipRegister: defaultValues.sipRegister ?? true,
          waBridgeUrl: defaultValues.waBridgeUrl ?? "",
        }
      : { sipPort: 5060, sipTransport: "udp", sipRegister: true },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const showSip = selectedTipo === "voice_did";
  const showWa = selectedTipo === "whatsapp";
  const showIdentificador = selectedTipo !== "whatsapp";
  const hasExistingGateway = mode === "edit" && !!defaultValues?.pbxGatewayUuid;

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-5">
      {form.errors?.length ? (
        <div className="border-destructive/50 bg-destructive/10 rounded-md border p-3">
          <p className="text-destructive text-sm">{form.errors.join(" ")}</p>
        </div>
      ) : null}

      {mode === "edit" && defaultValues ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.tipo.id}>Tipo de canal</Label>
        <Select
          name={fields.tipo.name}
          defaultValue={defaultValues?.tipo}
          onValueChange={setSelectedTipo}
        >
          <SelectTrigger
            id={fields.tipo.id}
            aria-invalid={fields.tipo.errors?.length ? true : undefined}
          >
            <SelectValue placeholder="Escolha o tipo" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CHANNEL_TYPE_LABEL) as ChannelType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {CHANNEL_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fields.tipo.errors?.length ? (
          <p className="text-destructive text-sm">{fields.tipo.errors.join(" ")}</p>
        ) : null}
      </div>

      {showIdentificador ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.identificador.id}>Identificador</Label>
          <Input
            {...getInputProps(fields.identificador, { type: "text" })}
            key={fields.identificador.key}
            autoComplete="off"
            required
          />
          <p className="text-muted-foreground text-xs">
            {selectedTipo && selectedTipo in TYPE_HINTS
              ? TYPE_HINTS[selectedTipo as ChannelType]
              : "Depende do tipo escolhido — DID, número WA, email ou identificador interno."}
          </p>
          {fields.identificador.errors?.length ? (
            <p className="text-destructive text-sm">{fields.identificador.errors.join(" ")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.nomeAmigavel.id}>Nome amigável</Label>
        <Input
          {...getInputProps(fields.nomeAmigavel, { type: "text" })}
          key={fields.nomeAmigavel.key}
          autoComplete="off"
          required
          placeholder="Ex.: Comercial — Linha SP"
        />
        {fields.nomeAmigavel.errors?.length ? (
          <p className="text-destructive text-sm">{fields.nomeAmigavel.errors.join(" ")}</p>
        ) : null}
      </div>

      {/* WhatsApp section — wa-bridge URL */}
      {showWa ? (
        <div
          key={`wa-${selectedTipo}`}
          className="border-border bg-surface-1 flex flex-col gap-4 rounded-lg border p-4"
        >
          <div>
            <h3 className="font-display text-foreground text-sm font-semibold">Conexão WhatsApp</h3>
            <p className="text-muted-foreground text-xs">
              Informe a URL do wa-bridge. Após criar o canal, você escaneará o QR code para
              conectar.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={fields.waBridgeUrl.id}>URL do wa-bridge</Label>
            <Input
              {...getInputProps(fields.waBridgeUrl, { type: "url" })}
              key={fields.waBridgeUrl.key}
              autoComplete="off"
              required
              placeholder="http://localhost:9090"
            />
            {fields.waBridgeUrl.errors?.length ? (
              <p className="text-destructive text-sm">{fields.waBridgeUrl.errors.join(" ")}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* SIP Trunk section — only for voice_did */}
      {showSip ? (
        <div
          key={`sip-${selectedTipo}`}
          className="border-border bg-surface-1 flex flex-col gap-4 rounded-lg border p-4"
        >
          <div>
            <h3 className="font-display text-foreground text-sm font-semibold">
              Configuração SIP Trunk
            </h3>
            <p className="text-muted-foreground text-xs">
              {hasExistingGateway
                ? "Gateway provisionado no PBX. Altere os campos abaixo para atualizar."
                : "Configure a conexão com o provedor VoIP para este DID."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fields.sipHost.id}>Host SIP</Label>
              <Input
                {...getInputProps(fields.sipHost, { type: "text" })}
                key={fields.sipHost.key}
                autoComplete="off"
                required
                placeholder="sip.provedor.com.br"
              />
              {fields.sipHost.errors?.length ? (
                <p className="text-destructive text-sm">{fields.sipHost.errors.join(" ")}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={fields.sipPort.id}>Porta</Label>
              <Input
                {...getInputProps(fields.sipPort, { type: "number" })}
                key={fields.sipPort.key}
                min={1}
                max={65535}
              />
              {fields.sipPort.errors?.length ? (
                <p className="text-destructive text-sm">{fields.sipPort.errors.join(" ")}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fields.sipTransport.id}>Transporte</Label>
              <Select
                name={fields.sipTransport.name}
                defaultValue={defaultValues?.sipTransport ?? "udp"}
              >
                <SelectTrigger
                  id={fields.sipTransport.id}
                  aria-invalid={fields.sipTransport.errors?.length ? true : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIP_TRANSPORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fields.sipTransport.errors?.length ? (
                <p className="text-destructive text-sm">{fields.sipTransport.errors.join(" ")}</p>
              ) : null}
            </div>

            <div className="flex items-end gap-3 pb-0.5">
              <label className="text-foreground flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={fields.sipRegister.name}
                  defaultChecked={defaultValues?.sipRegister ?? true}
                  value="true"
                  className="border-border accent-primary size-4 rounded-md border"
                />
                Enviar REGISTER ao provedor
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fields.sipUsername.id}>Usuário SIP</Label>
              <Input
                {...getInputProps(fields.sipUsername, { type: "text" })}
                key={fields.sipUsername.key}
                autoComplete="off"
                required
                placeholder="seu_usuario"
              />
              {fields.sipUsername.errors?.length ? (
                <p className="text-destructive text-sm">{fields.sipUsername.errors.join(" ")}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={fields.sipPassword.id}>Senha SIP</Label>
              <Input
                {...getInputProps(fields.sipPassword, { type: "password" })}
                key={fields.sipPassword.key}
                autoComplete="new-password"
                required
                placeholder={hasExistingGateway ? "••••••••  (preencha para alterar)" : "senha_sip"}
              />
              {fields.sipPassword.errors?.length ? (
                <p className="text-destructive text-sm">{fields.sipPassword.errors.join(" ")}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href="/channels">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar canal" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
