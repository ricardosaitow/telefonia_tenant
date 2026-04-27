-- Fix RLS: tratar setting "vazio" igual a setting "ausente".
--
-- Postgres marca GUCs custom como "registered" após o primeiro set_config.
-- Em conexões subsequentes do pool que NÃO chamem set_config,
-- current_setting('app.current_tenant', true) retorna '' (string vazia)
-- — não NULL. O cast `''::uuid` levanta 22P02 (invalid syntax) e o request
-- falha com erro Prisma em vez de devolver 0 rows silenciosamente.
--
-- Ainda é fail-closed (não vaza), mas vira ruído de log e potencial DoS
-- (qualquer query sem context derruba a request com stack trace).
--
-- nullif(current_setting(...), '') normaliza '' para NULL → predicate falha
-- silenciosamente → 0 rows. Robusto contra os 3 estados: ausente, vazio, setado.

DROP POLICY IF EXISTS tenant_isolation_tenants ON "tenants";
CREATE POLICY tenant_isolation_tenants ON "tenants"
  USING (id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.current_tenant', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation_tenant_memberships ON "tenant_memberships";
CREATE POLICY tenant_isolation_tenant_memberships ON "tenant_memberships"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
