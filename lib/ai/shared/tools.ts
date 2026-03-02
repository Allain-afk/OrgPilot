import { tool } from "ai";
import { z } from "zod";
import {
  updateTaskStatus as dbUpdateTaskStatus,
  findUserByRole,
  assignTaskOwner as dbAssignTaskOwner,
  getTasksForReview,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";
import {
  sendNotification as notifySend,
  type NotificationResult,
} from "@/lib/services/notifications";
import type { AgentId } from "@/lib/types";

const userRoleEnum = z.enum([
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
]);

const taskStatusEnum = z.enum([
  "NEW",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
]);

const taskTypeEnum = z.enum([
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
]);

const sectionEnum = z.enum([
  "NEWS",
  "FEATURES",
  "OPINION",
  "SPORTS",
  "LIFESTYLE",
  "PHOTOGRAPHY",
  "LAYOUT",
]);

const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// Re-export enums for sub-agent tool files
export {
  userRoleEnum,
  taskStatusEnum,
  taskTypeEnum,
  sectionEnum,
  priorityEnum,
};

// ─── updateTaskStatus ───────────────────────────────────────────

export function makeUpdateTaskStatusTool(agentId: AgentId) {
  return tool({
    description:
      "Update the status of an existing task. Use when an event indicates progress or resolution.",
    inputSchema: z.object({
      taskId: z.string().describe("ID of the task to update"),
      status: taskStatusEnum.describe("New status"),
      comment: z
        .string()
        .optional()
        .describe("Optional note about why the status changed"),
    }),
    execute: async (input) => {
      const task = await dbUpdateTaskStatus(
        input.taskId,
        input.status,
        input.comment
      );

      await createLog({
        taskId: task.id,
        agentId,
        eventType: "TASK_UPDATE",
        rawEvent: input,
        actionDescription: `Updated task "${task.title}" status to ${input.status}${input.comment ? ` — ${input.comment}` : ""}`,
        autoExecuted: true,
      });

      return {
        success: true,
        taskId: task.id,
        title: task.title,
        status: task.status,
      };
    },
  });
}

// ─── sendNotification ───────────────────────────────────────────

export function makeSendNotificationTool(agentId: AgentId) {
  return tool({
    description:
      "Send a notification to a staff member. Use sparingly — only for urgent items or approaching deadlines.",
    inputSchema: z.object({
      userId: z.string().describe("ID of the user to notify"),
      subject: z.string().describe("Notification subject line"),
      body: z.string().describe("Notification body text"),
      channel: z
        .enum(["EMAIL", "LOG_ONLY"])
        .describe("Delivery channel. Use LOG_ONLY unless truly urgent."),
    }),
    execute: async (input) => {
      const result: NotificationResult = await notifySend(input);

      const description = result.mockMode
        ? `Email sent in MOCK mode to ${result.recipientName} (${result.recipientEmail}). Original recipient: ${result.originalRecipient}. Subject: "${input.subject}"`
        : `Sent ${input.channel} notification to ${result.recipientName} (${result.recipientEmail}): "${input.subject}"`;

      await createLog({
        agentId,
        eventType: "NOTIFICATION",
        rawEvent: { ...input, mockMode: result.mockMode },
        actionDescription: description,
        autoExecuted: true,
      });

      return {
        success: true,
        message: `Notification sent via ${input.channel}`,
        mockMode: result.mockMode,
      };
    },
  });
}

// ─── requestApproval ────────────────────────────────────────────

export function makeRequestApprovalTool(agentId: AgentId) {
  return tool({
    description:
      "Request human approval for a high-impact or uncertain action. The action will be queued for an officer to review.",
    inputSchema: z.object({
      actionSummary: z
        .string()
        .describe(
          "Clear description of what action is proposed and why it needs approval"
        ),
      proposedChanges: z
        .record(z.string(), z.unknown())
        .describe(
          "JSON object describing the changes to apply if approved. Must include taskId if updating a task."
        ),
    }),
    execute: async (input) => {
      const log = await createLog({
        taskId:
          typeof input.proposedChanges.taskId === "string"
            ? input.proposedChanges.taskId
            : undefined,
        agentId,
        eventType: "APPROVAL_REQUEST",
        rawEvent: input,
        actionDescription: input.actionSummary,
        autoExecuted: false,
        proposedChanges: input.proposedChanges,
      });

      return {
        success: true,
        approvalId: log.id,
        message:
          "Action queued for human approval. An editor will review and approve or dismiss.",
      };
    },
  });
}

// ─── assignOwner ────────────────────────────────────────────────

export function makeAssignOwnerTool(agentId: AgentId) {
  return tool({
    description:
      "Reassign a task to a different staff member by role. Use for escalations, delegation, or when the original owner is unavailable.",
    inputSchema: z.object({
      taskId: z.string().describe("ID of the task to reassign"),
      ownerRole: userRoleEnum.describe(
        "Role of the staff member who should own this task"
      ),
      reason: z
        .string()
        .optional()
        .describe("Why the task is being reassigned"),
    }),
    execute: async (input) => {
      const user = await findUserByRole(input.ownerRole);
      if (!user) {
        return {
          success: false,
          message: `No user found with role ${input.ownerRole}`,
        };
      }

      const task = await dbAssignTaskOwner(input.taskId, user.id);

      await createLog({
        taskId: task.id,
        agentId,
        eventType: "TASK_UPDATE",
        rawEvent: input,
        actionDescription: `Reassigned task "${task.title}" to ${input.ownerRole} (${user.name})${input.reason ? ` — ${input.reason}` : ""}`,
        autoExecuted: true,
      });

      return {
        success: true,
        taskId: task.id,
        title: task.title,
        newOwner: { id: user.id, name: user.name, role: user.role },
      };
    },
  });
}

// ─── logAgentAction ─────────────────────────────────────────────

export function makeLogAgentActionTool(agentId: AgentId) {
  return tool({
    description:
      "Log an agent reasoning step or decision for the audit trail. Use after creating/updating tasks to record why you chose a specific type, owner, or priority.",
    inputSchema: z.object({
      taskId: z
        .string()
        .optional()
        .describe("Related task ID, if applicable"),
      description: z
        .string()
        .describe(
          "What you did and why (e.g., 'Classified as STORY_PITCH with HIGH priority because the deadline is within 48 hours')"
        ),
    }),
    execute: async (input) => {
      const log = await createLog({
        taskId: input.taskId,
        agentId,
        eventType: "AGENT_REASONING",
        rawEvent: input,
        actionDescription: input.description,
        autoExecuted: true,
      });

      return { success: true, logId: log.id };
    },
  });
}

// ─── listTasks ──────────────────────────────────────────────────

export function makeListTasksTool(agentId: AgentId) {
  return tool({
    description:
      "Query existing tasks with optional filters. Use for task health reviews, checking for duplicates, or reviewing section workload.",
    inputSchema: z.object({
      status: taskStatusEnum.optional().describe("Filter by status"),
      type: taskTypeEnum.optional().describe("Filter by task type"),
      section: sectionEnum.optional().describe("Filter by publication section"),
      priority: priorityEnum.optional().describe("Filter by priority"),
      overdue: z
        .boolean()
        .optional()
        .describe(
          "If true, only return tasks that are past their due date and not done/cancelled"
        ),
    }),
    execute: async (input) => {
      const tasks = await getTasksForReview({
        status: input.status,
        type: input.type,
        section: input.section,
        priority: input.priority,
        overdue: input.overdue,
      });

      return {
        count: tasks.length,
        tasks: tasks.map((t) => {
          const rec = t as Record<string, unknown>;
          const owner = rec.owner as
            | { id: string; name: string; role: string }
            | null
            | undefined;
          return {
            id: t.id,
            title: t.title,
            type: t.type,
            section: (rec.section as string) ?? null,
            status: t.status,
            priority: t.priority,
            owner: owner
              ? { id: owner.id, name: owner.name, role: owner.role }
              : null,
            dueDate: t.dueDate?.toISOString() ?? null,
            isOverdue: t.isOverdue,
            daysSinceUpdate: t.daysSinceUpdate,
          };
        }),
      };
    },
  });
}

// ─── Build shared tool set for a given agent ────────────────────

export function buildSharedTools(agentId: AgentId) {
  return {
    updateTaskStatus: makeUpdateTaskStatusTool(agentId),
    sendNotification: makeSendNotificationTool(agentId),
    requestApproval: makeRequestApprovalTool(agentId),
    assignOwner: makeAssignOwnerTool(agentId),
    logAgentAction: makeLogAgentActionTool(agentId),
    listTasks: makeListTasksTool(agentId),
  };
}
