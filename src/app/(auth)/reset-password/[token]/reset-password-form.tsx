"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/features/auth/reset-password-action";
import { resetPasswordSchema } from "@/features/auth/schemas";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [lastResult, action, pending] = useActionState(resetPasswordAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: resetPasswordSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={action} className="flex flex-col gap-4">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.password.id}>Nova senha</Label>
          <div className="relative">
            <Input
              {...getInputProps(fields.password, { type: showPassword ? "text" : "password" })}
              key={fields.password.key}
              autoComplete="new-password"
              required
              minLength={12}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-muted-foreground text-xs">Mínimo 12 caracteres.</p>
          {fields.password.errors?.length ? (
            <p className="text-destructive text-sm">{fields.password.errors.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.confirmPassword.id}>Confirmar nova senha</Label>
          <div className="relative">
            <Input
              {...getInputProps(fields.confirmPassword, {
                type: showConfirm ? "text" : "password",
              })}
              key={fields.confirmPassword.key}
              autoComplete="new-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label={showConfirm ? "Esconder senha" : "Mostrar senha"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fields.confirmPassword.errors?.length ? (
            <p className="text-destructive text-sm">{fields.confirmPassword.errors.join(" ")}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Redefinindo..." : "Redefinir senha"}
      </Button>

      <div className="border-border border-t pt-4">
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="text-accent-light hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </form>
  );
}
