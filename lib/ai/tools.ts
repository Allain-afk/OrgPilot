import { tool } from "ai";
import { z } from "zod";
import {
  createTask as dbCreateTask,
  updateTaskStatus as dbUpdateTaskStatus,
  findUserByRole,
  assignTaskOwner as dbAssignTaskOwner,
  getTasksForReview,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";
import { sendNotification as notifySend } from "@/lib/services/notifications";

// ─── createTask ─────────────────────────────────────────────────
export const createTaskTool = tool({
  description:
    "Create a new task on the Ops Board. Use this when a form submission, email, or other event introduces new work that needs tracking.",
  inputSchema: z.object({
    title: z.string().describe("Action-oriented title, max 80 chars"),
    description: z
      .string()
      .describe("Detailed description with key facts from the event"),
    type: z
      .enum(["EVENT_REQUEST", "FACILITY_ISSUE", "FINANCE_REQUEST", "MEMBERSHIP", "FEEDBACK_OR_COMPLAINT", "OTHER"])
      .describe("Task category"),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .describe("Priority level"),
    suggestedOwnerRole: z
      .enum([
        "PRESIDENT",
        "VICE_PRESIDENT",
        "SECRETARY",
        "TREASURER",
        "LOGISTICS",
        "OTHER",
      ])
      .optional()
      .describe(
        "Role of the officer who should own this task. If unsure, omit."
      ),
    dueDate: z
      .string()
      .optional()
      .describe("ISO 8601 date string if a deadline can be inferred"),
    sourceSystem: z.enum(["FORM", "EMAIL", "MANUAL"]).describe("Origin system"),
    sourceId: z.string().describe("Unique ID from the source system"),
  }),
  execute: async (input) => {
    // Resolve owner from role
    let ownerId: string | undefined;
    if (input.suggestedOwnerRole) {
      const user = await findUserByRole(input.suggestedOwnerRole);
      if (user) ownerId = user.id;
    }

    const task = await dbCreateTask({
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      ownerId,
      dueDate: input.dueDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created task "${task.title}" [${task.type}/${task.priority}]${ownerId ? ` assigned to ${input.suggestedOwnerRole}` : ""}`,
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

// ─── updateTaskStatus ───────────────────────────────────────────
export const updateTaskStatusTool = tool({
  description:
    "Update the status of an existing task. Use when an event indicates progress or resolution.",
  inputSchema: z.object({
    taskId: z.string().describe("ID of the task to update"),
    status: z
      .enum(["NEW", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"])
      .describe("New status"),
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

// ─── sendNotification ───────────────────────────────────────────
export const sendNotificationTool = tool({
  description:
    "Send a notification to an officer. Use sparingly — only for urgent items or approaching deadlines.",
  inputSchema: z.object({
    userId: z.string().describe("ID of the user to notify"),
    subject: z.string().describe("Notification subject line"),
    body: z.string().describe("Notification body text"),
    channel: z
      .enum(["EMAIL", "LOG_ONLY"])
      .describe("Delivery channel. Use LOG_ONLY unless truly urgent."),
  }),
  execute: async (input) => {
    await notifySend(input);

    await createLog({
      eventType: "NOTIFICATION",
      rawEvent: input,
      actionDescription: `Sent ${input.channel} notification to user ${input.userId}: "${input.subject}"`,
      autoExecuted: true,
    });

    return { success: true, message: `Notification sent via ${input.channel}` };
  },
});

// ─── requestApproval ────────────────────────────────────────────
export const requestApprovalTool = tool({
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
        'JSON object describing the changes to apply if approved. Must include taskId if updating a task.'
      ),
  }),
  execute: async (input) => {
    const log = await createLog({
      taskId:
        typeof input.proposedChanges.taskId === "string"
          ? input.proposedChanges.taskId
          : undefined,
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
        "Action queued for human approval. An officer will review and approve or dismiss.",
    };
  },
});

// ─── assignOwner ────────────────────────────────────────────────
export const assignOwnerTool = tool({
  description:
    "Reassign a task to a different officer by role. Use for escalations, checklist delegation, or when the original owner is unavailable.",
  inputSchema: z.object({
    taskId: z.string().describe("ID of the task to reassign"),
    ownerRole: z
      .enum([
        "PRESIDENT",
        "VICE_PRESIDENT",
        "SECRETARY",
        "TREASURER",
        "LOGISTICS",
        "OTHER",
      ])
      .describe("Role of the officer who should own this task"),
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

// ─── logAgentAction ─────────────────────────────────────────────
export const logAgentActionTool = tool({
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
        "What you did and why (e.g., 'Classified as FACILITY_ISSUE with HIGH priority because the report mentions a safety hazard')"
      ),
  }),
  execute: async (input) => {
    const log = await createLog({
      taskId: input.taskId,
      eventType: "AGENT_REASONING",
      rawEvent: input,
      actionDescription: input.description,
      autoExecuted: true,
    });

    return { success: true, logId: log.id };
  },
});

// ─── listTasks ──────────────────────────────────────────────────
export const listTasksTool = tool({
  description:
    "Query existing tasks with optional filters. Use for task health reviews, weekly recaps, or checking for duplicates before creating new tasks.",
  inputSchema: z.object({
    status: z
      .enum(["NEW", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"])
      .optional()
      .describe("Filter by status"),
    type: z
      .enum(["EVENT_REQUEST", "FACILITY_ISSUE", "FINANCE_REQUEST", "MEMBERSHIP", "FEEDBACK_OR_COMPLAINT", "OTHER"])
      .optional()
      .describe("Filter by task type"),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .optional()
      .describe("Filter by priority"),
    overdue: z
      .boolean()
      .optional()
      .describe("If true, only return tasks that are past their due date and not done/cancelled"),
  }),
  execute: async (input) => {
    const tasks = await getTasksForReview({
      status: input.status,
      type: input.type,
      priority: input.priority,
      overdue: input.overdue,
    });

    return {
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        status: t.status,
        priority: t.priority,
        owner: t.owner ? { id: t.owner.id, name: t.owner.name, role: t.owner.role } : null,
        dueDate: t.dueDate?.toISOString() ?? null,
        isOverdue: t.isOverdue,
        daysSinceUpdate: t.daysSinceUpdate,
      })),
    };
  },
});

// ─── Export all tools as a record for the agent ─────────────────
export const agentTools = {
  createTask: createTaskTool,
  updateTaskStatus: updateTaskStatusTool,
  sendNotification: sendNotificationTool,
  requestApproval: requestApprovalTool,
  assignOwner: assignOwnerTool,
  logAgentAction: logAgentActionTool,
  listTasks: listTasksTool,
};
