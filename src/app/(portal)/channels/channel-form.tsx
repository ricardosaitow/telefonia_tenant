"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";

import { FieldTooltip } from "@/components/composed/field-tooltip";
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

const SECURITY_OPTIONS = [
  { value: "tls", label: "TLS (SSL)" },
  { value: "starttls", label: "STARTTLS" },
  { value: "none", label: "Nenhuma" },
] as const;

const INBOUND_PROTO_OPTIONS = [
  { value: "imap", label: "IMAP" },
  { value: "pop3", label: "POP3" },
] as const;

// Provider hints: auto-fill host/port when user types known email domain
type ProviderHint = {
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
};

const PROVIDER_HINTS: Record<string, ProviderHint> = {
  "gmail.com": {
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    imapHost: "imap.gmail.com",
    imapPort: 993,
  },
  "outlook.com": {
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    imapHost: "outlook.office365.com",
    imapPort: 993,
  },
  "hotmail.com": {
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    imapHost: "outlook.office365.com",
    imapPort: 993,
  },
  "yahoo.com": {
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 587,
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
  },
};

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
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpSecurity?: string | null;
    inboundProto?: string | null;
    inboundHost?: string | null;
    inboundPort?: number | null;
    inboundUser?: string | null;
    inboundSecurity?: string | null;
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
          smtpHost: defaultValues.smtpHost ?? "",
          smtpPort: defaultValues.smtpPort ?? 587,
          smtpUser: defaultValues.smtpUser ?? "",
          smtpPass: "",
          smtpSecurity: defaultValues.smtpSecurity ?? "tls",
          inboundProto: defaultValues.inboundProto ?? "imap",
          inboundHost: defaultValues.inboundHost ?? "",
          inboundPort: defaultValues.inboundPort ?? 993,
          inboundUser: defaultValues.inboundUser ?? "",
          inboundPass: "",
          inboundSecurity: defaultValues.inboundSecurity ?? "tls",
        }
      : {
          sipPort: 5060,
          sipTransport: "udp",
          sipRegister: true,
          smtpPort: 587,
          smtpSecurity: "tls",
          inboundProto: "imap",
          inboundPort: 993,
          inboundSecurity: "tls",
        },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const showSip = selectedTipo === "voice_did";
  const showEmail = selectedTipo === "email";
  const showIdentificador = selectedTipo !== "whatsapp";
  const hasExistingGateway = mode === "edit" && !!defaultValues?.pbxGatewayUuid;
  const hasExistingEmailConfig = mode === "edit" && !!defaultValues?.smtpHost;

  // Provider hint detection from identificador
  const [providerHint, setProviderHint] = useState<ProviderHint | null>(null);

  const handleIdentificadorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const domain = val.split("@")[1]?.toLowerCase();
    if (domain && PROVIDER_HINTS[domain]) {
      setProviderHint(PROVIDER_HINTS[domain]);
    } else {
      setProviderHint(null);
    }
  }, []);

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
            onChange={showEmail ? handleIdentificadorChange : undefined}
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

      {/* Email section — SMTP + Inbound (IMAP/POP3) */}
      {showEmail ? (
        <div
          key={`email-${selectedTipo}`}
          className="border-border bg-surface-1 flex flex-col gap-5 rounded-lg border p-4"
        >
          <div>
            <h3 className="font-display text-foreground text-sm font-semibold">
              Configuração de Email
            </h3>
            <p className="text-muted-foreground text-xs">
              Configure os servidores de envio (SMTP) e recebimento (IMAP/POP3).
            </p>
          </div>

          {providerHint && mode === "create" ? (
            <div className="bg-accent/10 border-accent/20 rounded-md border p-3">
              <p className="text-accent-light text-xs">
                Detectamos seu provedor. Campos de servidor e porta foram sugeridos automaticamente.
              </p>
            </div>
          ) : null}

          {/* SMTP (Outbound) */}
          <div className="flex flex-col gap-4">
            <h4 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              SMTP (Envio)
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2 sm:col-span-1">
                <Label htmlFor={fields.smtpHost.id} className="flex items-center gap-1.5">
                  Servidor SMTP
                  <FieldTooltip text="Endereço do servidor de envio. Ex: smtp.gmail.com, smtp.office365.com" />
                </Label>
                <Input
                  {...getInputProps(fields.smtpHost, { type: "text" })}
                  key={`smtpHost-${providerHint?.smtpHost ?? ""}`}
                  defaultValue={defaultValues?.smtpHost ?? providerHint?.smtpHost ?? ""}
                  autoComplete="off"
                  required
                  placeholder="smtp.provedor.com"
                />
                {fields.smtpHost.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.smtpHost.errors.join(" ")}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.smtpPort.id} className="flex items-center gap-1.5">
                  Porta
                  <FieldTooltip text="Porta do servidor SMTP. Comum: 587 (TLS/STARTTLS) ou 465 (SSL)" />
                </Label>
                <Input
                  {...getInputProps(fields.smtpPort, { type: "number" })}
                  key={`smtpPort-${providerHint?.smtpPort ?? ""}`}
                  defaultValue={defaultValues?.smtpPort ?? providerHint?.smtpPort ?? 587}
                  min={1}
                  max={65535}
                />
                {fields.smtpPort.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.smtpPort.errors.join(" ")}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.smtpSecurity.id}>Segurança</Label>
                <Select
                  name={fields.smtpSecurity.name}
                  defaultValue={defaultValues?.smtpSecurity ?? "tls"}
                >
                  <SelectTrigger id={fields.smtpSecurity.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.smtpUser.id} className="flex items-center gap-1.5">
                  Usuário
                  <FieldTooltip text="Geralmente seu email completo" />
                </Label>
                <Input
                  {...getInputProps(fields.smtpUser, { type: "text" })}
                  key={fields.smtpUser.key}
                  autoComplete="off"
                  required
                  placeholder="seu@email.com"
                />
                {fields.smtpUser.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.smtpUser.errors.join(" ")}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.smtpPass.id}>Senha</Label>
                <Input
                  {...getInputProps(fields.smtpPass, { type: "password" })}
                  key={fields.smtpPass.key}
                  autoComplete="new-password"
                  required={mode === "create"}
                  placeholder={
                    hasExistingEmailConfig ? "••••••••  (preencha para alterar)" : "senha"
                  }
                />
                {fields.smtpPass.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.smtpPass.errors.join(" ")}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Inbound (IMAP/POP3) */}
          <div className="flex flex-col gap-4">
            <h4 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              Recebimento
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-2 sm:col-span-1">
                <Label htmlFor={fields.inboundProto.id} className="flex items-center gap-1.5">
                  Protocolo
                  <FieldTooltip text="IMAP mantém emails no servidor. POP3 baixa e remove. Recomendado: IMAP" />
                </Label>
                <Select
                  name={fields.inboundProto.name}
                  defaultValue={defaultValues?.inboundProto ?? "imap"}
                >
                  <SelectTrigger id={fields.inboundProto.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INBOUND_PROTO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:col-span-1">
                <Label htmlFor={fields.inboundHost.id} className="flex items-center gap-1.5">
                  Servidor
                  <FieldTooltip text="Endereço do servidor de recebimento. Ex: imap.gmail.com, pop.gmail.com" />
                </Label>
                <Input
                  {...getInputProps(fields.inboundHost, { type: "text" })}
                  key={`inboundHost-${providerHint?.imapHost ?? ""}`}
                  defaultValue={defaultValues?.inboundHost ?? providerHint?.imapHost ?? ""}
                  autoComplete="off"
                  required
                  placeholder="imap.provedor.com"
                />
                {fields.inboundHost.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.inboundHost.errors.join(" ")}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.inboundPort.id} className="flex items-center gap-1.5">
                  Porta
                  <FieldTooltip text="Porta do servidor. IMAP: 993 (TLS) ou 143. POP3: 995 (TLS) ou 110" />
                </Label>
                <Input
                  {...getInputProps(fields.inboundPort, { type: "number" })}
                  key={`inboundPort-${providerHint?.imapPort ?? ""}`}
                  defaultValue={defaultValues?.inboundPort ?? providerHint?.imapPort ?? 993}
                  min={1}
                  max={65535}
                />
                {fields.inboundPort.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.inboundPort.errors.join(" ")}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.inboundSecurity.id}>Segurança</Label>
                <Select
                  name={fields.inboundSecurity.name}
                  defaultValue={defaultValues?.inboundSecurity ?? "tls"}
                >
                  <SelectTrigger id={fields.inboundSecurity.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.inboundUser.id} className="flex items-center gap-1.5">
                  Usuário
                  <FieldTooltip text="Geralmente seu email completo" />
                </Label>
                <Input
                  {...getInputProps(fields.inboundUser, { type: "text" })}
                  key={fields.inboundUser.key}
                  autoComplete="off"
                  required
                  placeholder="seu@email.com"
                />
                {fields.inboundUser.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.inboundUser.errors.join(" ")}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fields.inboundPass.id}>Senha</Label>
                <Input
                  {...getInputProps(fields.inboundPass, { type: "password" })}
                  key={fields.inboundPass.key}
                  autoComplete="new-password"
                  required={mode === "create"}
                  placeholder={
                    hasExistingEmailConfig ? "••••••••  (preencha para alterar)" : "senha"
                  }
                />
                {fields.inboundPass.errors?.length ? (
                  <p className="text-destructive text-sm">{fields.inboundPass.errors.join(" ")}</p>
                ) : null}
              </div>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Essas informações estão disponíveis nas configurações do seu provedor de email (Gmail,
            Outlook, etc). Procure por &quot;configurações SMTP/IMAP&quot; no painel do provedor.
          </p>
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
