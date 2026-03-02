import { prisma } from "@/lib/db/prisma";
import type { TaskType, TaskStatus, TaskPriority, SourceSystem } from "@/lib/types";

// ─── Filters ────────────────────────────────────────────────────
export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  ownerId?: string;
}

// ─── Create ─────────────────────────────────────────────────────
export interface CreateTaskInput {
  title: string;
  description: string;
  type?: TaskType;
  priority?: TaskPriority;
  ownerId?: string;
  dueDate?: string | Date;
  sourceSystem?: SourceSystem;
  sourceId?: string;
}

export async function createTask(data: CreateTaskInput) {
  return prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type ?? "OTHER",
      priority: data.priority ?? "MEDIUM",
      status: "NEW",
      ownerId: data.ownerId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      sourceSystem: data.sourceSystem ?? "MANUAL",
      sourceId: data.sourceId ?? "",
    },
    include: { owner: true },
  });
}

// ─── Read ───────────────────────────────────────────────────────
export async function getAllTasks(filters?: TaskFilters) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;
  if (filters?.ownerId) where.ownerId = filters.ownerId;

  return prisma.task.findMany({
    where,
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: { owner: true, logs: { orderBy: { createdAt: "desc" } } },
  });
}

// ─── Update ─────────────────────────────────────────────────────
export async function updateTask(
  id: string,
  data: Partial<Omit<CreateTaskInput, "sourceSystem" | "sourceId">> & {
    status?: TaskStatus;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
  if (data.dueDate !== undefined)
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: { owner: true },
  });
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  _comment?: string
) {
  // Comment is reserved for future audit trail extensions
  return prisma.task.update({
    where: { id },
    data: { status },
    include: { owner: true },
  });
}

// ─── Helpers ────────────────────────────────────────────────────
export async function findTasksBySourceId(sourceId: string) {
  return prisma.task.findMany({
    where: { sourceId },
    include: { owner: true },
  });
}

export async function findUserByRole(role: string) {
  return prisma.user.findFirst({ where: { role } });
}

// ─── Assign owner ────────────────────────────────────────────────
export async function assignTaskOwner(taskId: string, ownerId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { ownerId },
    include: { owner: true },
  });
}

// ─── Task review / health check ─────────────────────────────────
export interface TaskReviewFilters {
  status?: string;
  type?: string;
  priority?: string;
  overdue?: boolean;
}

export async function getTasksForReview(filters?: TaskReviewFilters) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;
  if (filters?.priority) where.priority = filters.priority;

  const tasks = await prisma.task.findMany({
    where,
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  return tasks
    .map((t) => {
      const dueDateMs = t.dueDate ? new Date(t.dueDate).getTime() : null;
      const isOverdue = dueDateMs !== null && dueDateMs < now.getTime() && t.status !== "DONE" && t.status !== "CANCELLED";
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return { ...t, isOverdue, daysSinceUpdate };
    })
    .filter((t) => (filters?.overdue ? t.isOverdue : true));
}
