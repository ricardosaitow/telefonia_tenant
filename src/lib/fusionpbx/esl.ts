/**
 * Cliente ESL (Event Socket Library) minimal pra disparar `reloadxml` no
 * FusionPBX/FreeSWITCH após escrita direta em v_domains/v_extensions.
 *
 * FusionPBX cacheia configs em memória — sem reloadxml, novo Domain/Extension
 * só passa a valer no próximo restart. ESL roda em TCP 8021 com password
 * (default `ClueCon`).
 *
 * Protocolo: linhas separadas por `\n`, comando termina com linha em branco
 * (`\n\n`). Greeting é `Content-Type: auth/request` → respondemos com
 * `auth <password>`. Comando `api reloadxml` retorna síncrono.
 *
 * Não persistimos conexão entre chamadas: cada reloadxml abre, autentica,
 * envia, fecha. Operação é rara (só na criação/deleção de domain/extension).
 */
import net from "node:net";

type EslConfig = {
  host: string;
  port: number;
  password: string;
  timeoutMs: number;
};

function readConfig(): EslConfig {
  const host = process.env["FUSIONPBX_ESL_HOST"] ?? "172.31.0.31";
  const port = Number(process.env["FUSIONPBX_ESL_PORT"] ?? "8021");
  const password = process.env["FUSIONPBX_ESL_PASSWORD"] ?? "ClueCon";
  return { host, port, password, timeoutMs: 5_000 };
}

/**
 * Executa um comando `api ...` (síncrono) no FreeSWITCH e retorna o body do
 * reply. Lança em auth fail / timeout / connection refused.
 */
async function runApi(command: string): Promise<string> {
  const cfg = readConfig();
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: cfg.host, port: cfg.port });
    let buffer = "";
    let phase: "greeting" | "auth-reply" | "api-reply" = "greeting";
    let timer: NodeJS.Timeout | null = setTimeout(() => {
      socket.destroy();
      reject(new Error(`ESL timeout após ${cfg.timeoutMs}ms`));
    }, cfg.timeoutMs);

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      socket.destroy();
    };

    socket.on("error", (err) => {
      cleanup();
      reject(err);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      // ESL separa blocos por linha em branco. Parseamos um bloco por vez.
      while (true) {
        const idx = buffer.indexOf("\n\n");
        if (idx === -1) break;
        const headerBlock = buffer.slice(0, idx);
        let rest = buffer.slice(idx + 2);

        const headers: Record<string, string> = {};
        for (const line of headerBlock.split("\n")) {
          const sep = line.indexOf(": ");
          if (sep === -1) continue;
          headers[line.slice(0, sep)] = line.slice(sep + 2);
        }

        const ctype = headers["Content-Type"];
        const lengthStr = headers["Content-Length"];
        let body = "";
        if (lengthStr) {
          const length = Number(lengthStr);
          if (rest.length < length) {
            // body ainda incompleto; espera próximo chunk.
            break;
          }
          body = rest.slice(0, length);
          rest = rest.slice(length);
        }
        buffer = rest;

        if (phase === "greeting" && ctype === "auth/request") {
          socket.write(`auth ${cfg.password}\n\n`);
          phase = "auth-reply";
        } else if (phase === "auth-reply" && ctype === "command/reply") {
          if (!(headers["Reply-Text"] ?? "").startsWith("+OK")) {
            cleanup();
            reject(new Error(`ESL auth falhou: ${headers["Reply-Text"]}`));
            return;
          }
          socket.write(`api ${command}\n\n`);
          phase = "api-reply";
        } else if (phase === "api-reply" && ctype === "api/response") {
          cleanup();
          resolve(body);
          return;
        }
      }
    });
  });
}

/**
 * Recarrega XML configs no FreeSWITCH. Chama após qualquer escrita em
 * v_domains/v_extensions; senão a config nova fica invisível até restart.
 */
export async function reloadXml(): Promise<void> {
  const reply = await runApi("reloadxml");
  // Reply esperado: `+OK [Success]\n` ou `+OK\n`. Falhas vêm como `-ERR ...`.
  if (!reply.startsWith("+OK")) {
    throw new Error(`reloadxml retornou: ${reply.trim()}`);
  }
}
