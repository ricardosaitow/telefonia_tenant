"use client";

import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectWaAction } from "@/features/channels/connect-wa-action";
import type { WaBridgeCombined } from "@/lib/whatsapp/client";

const POLL_INTERVAL_MS = 3_000;

type WaConnectCardProps = {
  channelId: string;
};

type CardState =
  | { kind: "loading" }
  | { kind: "qr"; data: string }
  | { kind: "authenticating" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "error"; message: string };

export function WaConnectCard({ channelId }: WaConnectCardProps) {
  const [state, setState] = useState<CardState>({ kind: "loading" });
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/wa`);
      if (!res.ok) {
        setState({ kind: "error", message: "Erro ao consultar wa-bridge" });
        return;
      }
      const data: WaBridgeCombined = await res.json();

      if (!mountedRef.current) return;

      switch (data.state) {
        case "starting":
          setState({ kind: "loading" });
          break;
        case "qr":
          if (data.qr) {
            setState({ kind: "qr", data: data.qr });
          } else {
            setState({ kind: "loading" });
          }
          break;
        case "authenticated":
          setState({ kind: "authenticating" });
          break;
        case "ready":
          stopPolling();
          setState({ kind: "connecting" });
          startTransition(async () => {
            try {
              await connectWaAction(channelId);
              if (mountedRef.current) {
                setState({ kind: "connected" });
              }
            } catch {
              if (mountedRef.current) {
                setState({ kind: "error", message: "Erro ao finalizar conexão" });
              }
            }
          });
          break;
        case "auth_failure":
          setState({
            kind: "error",
            message: "Falha na autenticação do WhatsApp. Tente escanear novamente.",
          });
          break;
        case "disconnected":
          setState({ kind: "error", message: "WhatsApp desconectado. Verifique o wa-bridge." });
          break;
      }
    } catch {
      if (mountedRef.current) {
        setState({ kind: "error", message: "wa-bridge inacessível. Verifique se está rodando." });
      }
    }
  }, [channelId, stopPolling, startTransition]);

  useEffect(() => {
    mountedRef.current = true;
    // Start polling immediately (with 0ms delay) then every POLL_INTERVAL_MS.
    // Using setTimeout to avoid synchronous setState in effect body.
    const initial = setTimeout(poll, 0);
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearTimeout(initial);
      stopPolling();
    };
  }, [poll, stopPolling]);

  const handleRetry = () => {
    setState({ kind: "loading" });
    setTimeout(poll, 0);
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  return (
    <Card variant="solid" padding="default" className="border-accent/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="text-accent-light size-5" />
          Conectar WhatsApp
        </CardTitle>
        <CardDescription>
          {state.kind === "qr" &&
            "Abra o WhatsApp no celular > Aparelhos conectados > Escanear QR code"}
          {state.kind === "loading" && "Iniciando WhatsApp..."}
          {state.kind === "authenticating" && "Autenticando..."}
          {state.kind === "connecting" && "Finalizando conexão..."}
          {state.kind === "connected" && "WhatsApp conectado com sucesso!"}
          {state.kind === "error" && state.message}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex items-center justify-center py-4">
        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Aguardando QR code...</p>
          </div>
        )}

        {state.kind === "qr" && (
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG value={state.data} size={256} level="M" />
          </div>
        )}

        {state.kind === "authenticating" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="text-accent-light size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Conectando ao WhatsApp...</p>
          </div>
        )}

        {(state.kind === "connecting" || isPending) && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="text-accent-light size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Finalizando conexão...</p>
          </div>
        )}

        {state.kind === "connected" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <MessageCircle className="text-success size-8" />
            <p className="text-foreground text-sm font-medium">WhatsApp conectado!</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
