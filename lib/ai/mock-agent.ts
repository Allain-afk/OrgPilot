import {
  createTask as dbCreateTask,
  updateTaskStatus as dbUpdateTaskStatus,
  findUserByRole,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";

// ─── Types ──────────────────────────────────────────────────────
export interface AgentResult {
  summary: string;
  steps: Array<{
    stepNumber: number;
    toolCalls: unknown[];
    text: string;
  }>;
  toolCallCount: number;
}

// ─── Form type → task type mapping ──────────────────────────────
const FORM_TYPE_MAP: Record<string, { type: string; ownerRole: string; priority: string }> = {
  EVENT_REQUEST: {
    type: "EVENT_REQUEST",
    ownerRole: "PRESIDENT",
    priority: "HIGH",
  },
  FACILITY_ISSUE: {
    type: "FACILITY_ISSUE",
    ownerRole: "LOGISTICS",
    priority: "HIGH",
  },
  FINANCE_REQUEST: {
    type: "FINANCE_REQUEST",
    ownerRole: "TREASURER",
    priority: "MEDIUM",
  },
  MEMBERSHIP: {
    type: "MEMBERSHIP",
    ownerRole: "SECRETARY",
    priority: "MEDIUM",
  },
  FEEDBACK_OR_COMPLAINT: {
    type: "FEEDBACK_OR_COMPLAINT",
    ownerRole: "PRESIDENT",
    priority: "MEDIUM",
  },
};

// ─── Mock agent — deterministic fallback ────────────────────────
export async function runMockAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<AgentResult> {
  console.log("[MockAgent] Processing event:", JSON.stringify(event).slice(0, 200));

  const formType = (event.formType as string) ?? "OTHER";
  const payload = (event.payload as Record<string, unknown>) ?? {};
  const existingTasks = (context.existingTasks as unknown[]) ?? [];

  // If there are existing tasks for this source, update instead of create
  if (existingTasks.length > 0) {
    const existingTask = existingTasks[0] as { id: string; title: string };
    const task = await dbUpdateTaskStatus(existingTask.id, "IN_PROGRESS");

    await createLog({
      taskId: task.id,
      eventType: "TASK_UPDATE",
      rawEvent: event,
      actionDescription: `[Mock] Updated existing task "${task.title}" to IN_PROGRESS based on new event.`,
      autoExecuted: true,
    });

    return {
      summary: `Updated existing task "${task.title}" to IN_PROGRESS based on follow-up event.`,
      steps: [
        {
          stepNumber: 1,
          toolCalls: [{ tool: "updateTaskStatus", args: { taskId: task.id, status: "IN_PROGRESS" } }],
          text: `Updated task status`,
        },
      ],
      toolCallCount: 1,
    };
  }

  // Create a new task
  const mapping = FORM_TYPE_MAP[formType] ?? {
    type: "OTHER",
    ownerRole: "SECRETARY",
    priority: "MEDIUM",
  };

  const title =
    (payload.title as string) ??
    (payload.subject as string) ??
    `New ${formType} submission`;

  const description =
    (payload.description as string) ??
    (payload.body as string) ??
    `Automatically created from ${formType} form submission. Details: ${JSON.stringify(payload).slice(0, 500)}`;

  // Resolve owner
  let ownerId: string | undefined;
  const owner = await findUserByRole(mapping.ownerRole);
  if (owner) ownerId = owner.id;

  // Infer due date if provided
  const dueDate = (payload.preferredDate as string) ?? (payload.dueDate as string) ?? undefined;

  const task = await dbCreateTask({
    title,
    description,
    type: mapping.type as "EVENT_REQUEST" | "FACILITY_ISSUE" | "FINANCE_REQUEST" | "MEMBERSHIP" | "FEEDBACK_OR_COMPLAINT" | "OTHER",
    priority: mapping.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    ownerId,
    dueDate,
    sourceSystem: (event.sourceSystem as "FORM" | "EMAIL" | "MANUAL") ?? "FORM",
    sourceId: (payload.sourceId as string) ?? (payload.responseId as string) ?? `mock-${Date.now()}`,
  });

  await createLog({
    taskId: task.id,
    eventType: "INGEST_EVENT",
    rawEvent: event,
    actionDescription: `[Mock] Created task "${task.title}" [${task.type}/${task.priority}]${owner ? ` assigned to ${mapping.ownerRole} (${owner.name})` : ""}`,
    autoExecuted: true,
  });

  const summary = `Created task "${task.title}" with ${task.priority} priority as ${task.type}.${owner ? ` Assigned to ${owner.name} (${mapping.ownerRole}).` : ""}${dueDate ? ` Due date: ${dueDate}.` : ""}`;

  return {
    summary,
    steps: [
      {
        stepNumber: 1,
        toolCalls: [
          {
            tool: "createTask",
            args: {
              title: task.title,
              type: task.type,
              priority: task.priority,
            },
          },
        ],
        text: summary,
      },
    ],
    toolCallCount: 1,
  };
}
