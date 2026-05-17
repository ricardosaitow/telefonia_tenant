"use client";

import { Check, Clock, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  invoiceId: string;
  pixEmv: string | null;
  amountCents: number;
  tenantName: string;
  dueDateIso: string;
};

type StatusResponse = {
  status: string;
  pixEmv: string | null;
  paidAt: string | null;
  paid: boolean;
};

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function PixCheckoutClient({
  invoiceId,
  pixEmv: initialPixEmv,
  amountCents,
  tenantName,
  dueDateIso,
}: Props) {
  const router = useRouter();
  const [pixEmv, setPixEmv] = useState<string | null>(initialPixEmv);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cora/invoice/${invoiceId}/status`, {
          credentials: "include",
        });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as StatusResponse;
        setError(null);
        if (data.pixEmv) setPixEmv(data.pixEmv);
        if (data.paid) {
          setPaid(true);
          setTimeout(() => {
            window.location.href = "/api/logto/refresh-claims?redirectTo=/dashboard";
          }, 1500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "erro");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [invoiceId, paid, router]);

  async function copyBrCode() {
    if (!pixEmv) return;
    try {
      await navigator.clipboard.writeText(pixEmv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const dueDate = new Date(dueDateIso).toLocaleDateString("pt-BR");

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
            Pagar com Pix
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {tenantName} · {formatBRL(amountCents)}/mês
          </p>
        </header>

        <Card variant="solid" padding="lg" className="flex flex-col items-center gap-4">
          {paid ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="bg-accent-light/20 flex size-16 items-center justify-center rounded-2xl">
                <Check className="text-accent-light size-8" />
              </div>
              <h2 className="font-display text-xl font-bold">Pagamento confirmado!</h2>
              <p className="text-muted-foreground text-sm">Redirecionando pro dashboard...</p>
            </div>
          ) : pixEmv ? (
            <>
              <div className="rounded-md bg-white p-4">
                <QRCodeSVG value={pixEmv} size={220} level="M" includeMargin={false} />
              </div>
              <div className="text-center">
                <p className="text-foreground text-sm font-medium">
                  Escaneie pelo app do seu banco
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Pagamento confirmado em segundos
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyBrCode} className="w-full">
                {copied ? (
                  <>
                    <Check className="mr-2 size-4" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" /> Copiar código Pix
                  </>
                )}
              </Button>
              <details className="text-muted-foreground w-full text-xs">
                <summary className="cursor-pointer">Ver código completo</summary>
                <textarea
                  readOnly
                  value={pixEmv}
                  className="bg-surface-2 text-foreground mt-2 h-24 w-full rounded p-2 font-mono text-[10px]"
                />
              </details>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="bg-surface-2 flex size-16 items-center justify-center rounded-2xl">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
              <h2 className="font-display text-lg font-bold">Gerando QR Code...</h2>
              <p className="text-muted-foreground text-sm">
                Aguarde alguns segundos enquanto registramos sua cobrança.
              </p>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>
          )}

          <div className="text-muted-foreground flex w-full items-center justify-center gap-1.5 border-t pt-3 text-xs">
            <Clock className="size-3" />
            <span>Válido até {dueDate}</span>
          </div>
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Aguardando pagamento... esta página atualiza automaticamente quando recebermos a
          confirmação.
        </p>

        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" asChild>
            <a href="/choose-plan">Cancelar</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
