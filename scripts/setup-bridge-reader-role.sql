-- Setup da role `bridge_reader` para o data plane (bridge-ia) ler
-- agente publicado a partir de uma extensão discada.
--
-- Por que BYPASSRLS:
--   o bridge faz o lookup ANTES de saber qual tenant é a chamada
--   (a chave é (tenant_slug, identificador) vinda do dialplan). Não tem
--   como setar `app.current_tenant` antes de descobrir o tenant — daí o
--   bypass é necessário SÓ pra essa role e SÓ com SELECT em 5 tabelas
--   abaixo. Toda outra mutação/leitura continua sob RLS via app_user.
--
-- Senha:
--   dev usa o valor literal abaixo (só localhost, dev DB). Em prod, ops
--   roda `ALTER ROLE bridge_reader WITH PASSWORD '<vinda-do-Infisical>'`
--   após aplicar este script. Ver /root/telefonia-ia/docs/seguranca.md §5.3.
--
-- Esse script NÃO é uma Prisma migration — gestão de role é separada do
-- schema de dados. Roda 1x por banco. Idempotente.
--
-- Como rodar (dev):
--   docker exec -i portal_postgres_dev psql -U postgres -d portal_dev \
--     < scripts/setup-bridge-reader-role.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bridge_reader') THEN
    CREATE ROLE bridge_reader LOGIN PASSWORD 'dev_bridge_password' BYPASSRLS;  -- gitleaks:allow
  END IF;
END
$$;

GRANT CONNECT ON DATABASE portal_dev TO bridge_reader;
GRANT USAGE ON SCHEMA public TO bridge_reader;

GRANT SELECT ON TABLE
  tenants,
  channels,
  routing_rules,
  agents,
  agent_versions
TO bridge_reader;
