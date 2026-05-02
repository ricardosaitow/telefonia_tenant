"use server";

import { z } from "zod";

import { testImapConnection } from "@/lib/email/channel/imap-client";
import { testPop3Connection } from "@/lib/email/channel/pop3-client";
import { testSmtpConnection } from "@/lib/email/channel/smtp-client";
import type { InboundConfig, SmtpConfig } from "@/lib/email/channel/types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { emailSecuritySchema, inboundProtoSchema } from "./schemas";

const testSmtpSchema = z.object({
  type: z.literal("smtp"),
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1),
  pass: z.string().min(1),
  security: emailSecuritySchema,
});

const testInboundSchema = z.object({
  type: z.literal("inbound"),
  proto: inboundProtoSchema,
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1),
  pass: z.string().min(1),
  security: emailSecuritySchema,
});

const testConnectionSchema = z.discriminatedUnion("type", [testSmtpSchema, testInboundSchema]);

export const testConnectionAction = actionClient
  .schema(testConnectionSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "channel:manage");

    const rl = await checkRateLimit({
      key: `test_connection:${ctx.account.id}`,
      ...RATE_LIMITS.TEST_CONNECTION,
    });
    if (!rl.ok) {
      return { ok: false, error: `Muitas tentativas. Aguarde ${rl.resetSec}s.` };
    }

    if (parsedInput.type === "smtp") {
      const config: SmtpConfig = {
        host: parsedInput.host,
        port: parsedInput.port,
        user: parsedInput.user,
        pass: parsedInput.pass,
        security: parsedInput.security,
      };
      return testSmtpConnection(config);
    }

    const config: InboundConfig = {
      proto: parsedInput.proto,
      host: parsedInput.host,
      port: parsedInput.port,
      user: parsedInput.user,
      pass: parsedInput.pass,
      security: parsedInput.security,
    };

    if (parsedInput.proto === "pop3") {
      return testPop3Connection(config);
    }
    return testImapConnection(config);
  });
