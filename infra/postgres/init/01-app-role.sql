-- Bootstrap do banco do portal (apenas dev/teste).
-- Em produção, role e GRANTs são feitos via runbook separado, com senhas vindas do Infisical.
--
-- Por que separar `app_user` de `postgres` (superuser):
--   Postgres bypassa RLS pra superusers (atributo BYPASSRLS implícito).
--   Se a app conectar como superuser, TODA policy de tenant_isolation vira no-op
--   e os testes anti-cross-tenant passariam por engano. Logo, runtime SEMPRE
--   conecta como `app_user` (NOSUPERUSER, sem BYPASSRLS).
--
-- Migrations rodam como `postgres` (superuser do container). ALTER DEFAULT PRIVILEGES
-- abaixo garante que toda tabela criada por `postgres` em `public` ganhe os GRANTs
-- pra `app_user` automaticamente.

CREATE ROLE app_user
  WITH LOGIN
       PASSWORD 'dev_password'
       NOSUPERUSER
       NOCREATEDB
       NOCREATEROLE
       NOINHERIT
       NOBYPASSRLS;

GRANT CONNECT ON DATABASE portal_dev TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO app_user;
