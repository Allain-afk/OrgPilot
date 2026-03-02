// ─── Domain types — The Southern Scholar (USPF Student Publication) ──

export const TASK_TYPES = [
  "STORY_PITCH",
  "ARTICLE_ASSIGNMENT",
  "ARTICLE_REVIEW",
  "LAYOUT_REQUEST",
  "PHOTO_ASSIGNMENT",
  "EVENT_COVERAGE",
  "PUBLICATION_ISSUE",
  "SOCIAL_MEDIA_POST",
  "TEAM_TASK",
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
  "EDITOR_IN_CHIEF",
  "ASSOCIATE_EDITOR",
  "MANAGING_EDITOR",
  "HEAD_EDITORIALS",
  "HEAD_FEATURES_MARKETING",
  "WRITER",
  "PHOTOJOURNALIST",
  "LAYOUT_ARTIST",
  "ADVISER",
  "ADMIN",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SECTIONS = [
  "NEWS",
  "FEATURES",
  "OPINION",
  "SPORTS",
  "LIFESTYLE",
  "PHOTOGRAPHY",
  "LAYOUT",
] as const;
export type Section = (typeof SECTIONS)[number];

export const SOURCE_SYSTEMS = ["FORM", "EMAIL", "MANUAL"] as const;
export type SourceSystem = (typeof SOURCE_SYSTEMS)[number];

export const EVENT_TYPES = [
  "INGEST_EVENT",
  "TASK_UPDATE",
  "NOTIFICATION",
  "APPROVAL_REQUEST",
  "AGENT_REASONING",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const AGENT_IDS = [
  "MASTER",
  "EDITORIAL",
  "PRODUCTION",
  "OPERATIONS",
] as const;
export type AgentId = (typeof AGENT_IDS)[number];

// ─── Re-export generated Prisma model types ────────────────────
export type { UserModel as User } from "@/generated/prisma/models";
export type { TaskModel as Task } from "@/generated/prisma/models";
export type { AgentActionLogModel as AgentActionLog } from "@/generated/prisma/models";
