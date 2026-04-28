"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/argon2";
import { prismaAdmin } from "@/lib/db/admin-client";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";

import { signupSchema } from "./schemas";

/**
 * Versão Conform do signup. Mesma lógica de signupAction (criação atômica
 * Account + Tenant + Membership owner via prismaAdmin), mas no formato
 * `useActionState` + `parseWithZod`. Sucesso → redirect /login?signup=ok.
 *
 * P2002 (email duplicado) ou outras falhas → silently redirect mesmo
 * (anti-enumeration). Toda transação aborta atomicamente; nenhum tenant órfão.
 */
export async function signupFormAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: signupSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const passwordHash = await hashPassword(submission.value.password);

  try {
    await prismaAdmin.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          email: submission.value.email,
          passwordHash,
          nome: submission.value.nome,
          locale: submission.value.locale,
        },
      });
      await createTenantWithOwnerInTx(tx, {
        accountId: account.id,
        nomeTenant: submission.value.nomeTenant,
        locale: submission.value.locale,
      });
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      redirect("/login?signup=ok");
    }
    throw err;
  }

  redirect("/login?signup=ok");
}
