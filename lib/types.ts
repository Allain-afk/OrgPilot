// ─── Domain types ───────────────────────────────────────────────
// String unions matching the Prisma schema (no SQL enums for SQLite portability)

export const TASK_TYPES = [
  "EVENT_REQUEST",
  "ISSUE",
  "FACILITY",
  "FINANCE",
  "OTHER",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const USER_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "LOGISTICS",
  "OTHER",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SOURCE_SYSTEMS = ["FORM", "EMAIL", "MANUAL"] as const;
export type SourceSystem = (typeof SOURCE_SYSTEMS)[number];

export const EVENT_TYPES = [
  "INGEST_EVENT",
  "TASK_UPDATE",
  "NOTIFICATION",
  "APPROVAL_REQUEST",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ─── Re-export generated Prisma model types ────────────────────
export type { UserModel as User } from "@/generated/prisma/models";
export type { TaskModel as Task } from "@/generated/prisma/models";
export type { AgentActionLogModel as AgentActionLog } from "@/generated/prisma/models";
