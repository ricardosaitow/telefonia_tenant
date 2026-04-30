/*
  Warnings:

  - You are about to drop the `agent_knowledge` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "agent_knowledge" DROP CONSTRAINT "agent_knowledge_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "agent_knowledge" DROP CONSTRAINT "agent_knowledge_knowledge_source_id_fkey";

-- DropForeignKey
ALTER TABLE "agent_knowledge" DROP CONSTRAINT "agent_knowledge_tenant_id_fkey";

-- DropTable
DROP TABLE "agent_knowledge";
