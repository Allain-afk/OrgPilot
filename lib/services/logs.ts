import { prisma } from "@/lib/db/prisma";
import type { EventType, AgentId } from "@/lib/types";
import { updateTask } from "./tasks";

// ─── Create ─────────────────────────────────────────────────────
export interface CreateLogInput {
  taskId?: string;
  agentId?: AgentId;
  eventType: EventType;
  rawEvent?: unknown;
  actionDescription: string;
  autoExecuted?: boolean;
  proposedChanges?: unknown;
}

export async function createLog(data: CreateLogInput) {
  return prisma.agentActionLog.create({
    data: {
      taskId: data.taskId ?? null,
      agentId: data.agentId ?? "MASTER",
      eventType: data.eventType,
      rawEvent: data.rawEvent ? JSON.stringify(data.rawEvent) : "{}",
      actionDescription: data.actionDescription,
      autoExecuted: data.autoExecuted ?? true,
      proposedChanges: data.proposedChanges
        ? JSON.stringify(data.proposedChanges)
        : null,
    },
    include: { task: true },
  });
}

// ─── Read ───────────────────────────────────────────────────────
export async function getRecentLogs(limit = 50) {
  return prisma.agentActionLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { task: true },
  });
}

export async function getPendingApprovals() {
  return prisma.agentActionLog.findMany({
    where: {
      eventType: "APPROVAL_REQUEST",
      autoExecuted: false,
    },
    orderBy: { createdAt: "desc" },
    include: { task: true },
  });
}

// ─── Execute approval ───────────────────────────────────────────
export async function executeApproval(logId: string) {
  const log = await prisma.agentActionLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error(`Log entry ${logId} not found`);
  if (log.autoExecuted)
    throw new Error(`Log entry ${logId} was already executed`);

  // Parse proposed changes and apply them
  let result = null;
  if (log.proposedChanges) {
    const changes = JSON.parse(log.proposedChanges) as Record<string, unknown>;
    if (changes.taskId && typeof changes.taskId === "string") {
      const { taskId, ...updates } = changes;
      result = await updateTask(taskId, updates);
    }
  }

  // Mark as executed
  await prisma.agentActionLog.update({
    where: { id: logId },
    data: { autoExecuted: true },
  });

  return result;
}

export async function dismissApproval(logId: string) {
  return prisma.agentActionLog.update({
    where: { id: logId },
    data: { autoExecuted: true }, // Mark as handled
  });
}
