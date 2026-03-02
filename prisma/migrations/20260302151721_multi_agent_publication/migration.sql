-- AlterTable
ALTER TABLE "AgentActionLog" ADD COLUMN     "agentId" TEXT NOT NULL DEFAULT 'MASTER';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WRITER';
