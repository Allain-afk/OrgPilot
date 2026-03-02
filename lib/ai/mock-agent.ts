import {
  createTask as dbCreateTask,
  updateTaskStatus as dbUpdateTaskStatus,
  findUserByRole,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";
import type { AgentResult } from "./shared/types";
import type { AgentId } from "@/lib/types";

// ─── Form type -> task type mapping (publication domain) ────────
const FORM_TYPE_MAP: Record<
  string,
  { type: string; section: string | null; ownerRole: string; priority: string; agentId: AgentId }
> = {
  STORY_PITCH: {
    type: "STORY_PITCH",
    section: "NEWS",
    ownerRole: "MANAGING_EDITOR",
    priority: "MEDIUM",
    agentId: "EDITORIAL",
  },
  ARTICLE_ASSIGNMENT: {
    type: "ARTICLE_ASSIGNMENT",
    section: "NEWS",
    ownerRole: "HEAD_EDITORIALS",
    priority: "MEDIUM",
    agentId: "EDITORIAL",
  },
  ARTICLE_REVIEW: {
    type: "ARTICLE_REVIEW",
    section: null,
    ownerRole: "EDITOR_IN_CHIEF",
    priority: "HIGH",
    agentId: "EDITORIAL",
  },
  LAYOUT_REQUEST: {
    type: "LAYOUT_REQUEST",
    section: "LAYOUT",
    ownerRole: "LAYOUT_ARTIST",
    priority: "MEDIUM",
    agentId: "PRODUCTION",
  },
  PHOTO_ASSIGNMENT: {
    type: "PHOTO_ASSIGNMENT",
    section: "PHOTOGRAPHY",
    ownerRole: "PHOTOJOURNALIST",
    priority: "MEDIUM",
    agentId: "PRODUCTION",
  },
  EVENT_COVERAGE: {
    type: "EVENT_COVERAGE",
    section: "NEWS",
    ownerRole: "MANAGING_EDITOR",
    priority: "HIGH",
    agentId: "OPERATIONS",
  },
  PUBLICATION_ISSUE: {
    type: "PUBLICATION_ISSUE",
    section: null,
    ownerRole: "MANAGING_EDITOR",
    priority: "HIGH",
    agentId: "PRODUCTION",
  },
  SOCIAL_MEDIA_POST: {
    type: "SOCIAL_MEDIA_POST",
    section: null,
    ownerRole: "HEAD_FEATURES_MARKETING",
    priority: "MEDIUM",
    agentId: "PRODUCTION",
  },
  TEAM_TASK: {
    type: "TEAM_TASK",
    section: null,
    ownerRole: "MANAGING_EDITOR",
    priority: "MEDIUM",
    agentId: "OPERATIONS",
  },
};

const DEFAULT_MAPPING = {
  type: "OTHER",
  section: null,
  ownerRole: "MANAGING_EDITOR",
  priority: "MEDIUM",
  agentId: "MASTER" as AgentId,
};

export async function runMockAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<AgentResult> {
  console.log(
    "[MockAgent] Processing event:",
    JSON.stringify(event).slice(0, 200)
  );

  const formType = (event.formType as string) ?? "OTHER";
  const payload = (event.payload as Record<string, unknown>) ?? {};
  const existingTasks = (context.existingTasks as unknown[]) ?? [];

  if (existingTasks.length > 0) {
    const existingTask = existingTasks[0] as { id: string; title: string };
    const task = await dbUpdateTaskStatus(existingTask.id, "IN_PROGRESS");

    await createLog({
      taskId: task.id,
      agentId: "MASTER",
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
          toolCalls: [
            {
              tool: "updateTaskStatus",
              args: { taskId: task.id, status: "IN_PROGRESS" },
            },
          ],
          text: `Updated task status`,
        },
      ],
      toolCallCount: 1,
      agentId: "MASTER",
    };
  }

  const mapping = FORM_TYPE_MAP[formType] ?? DEFAULT_MAPPING;

  const title =
    (payload.title as string) ??
    (payload.subject as string) ??
    `New ${formType} submission`;

  const description =
    (payload.description as string) ??
    (payload.body as string) ??
    `Automatically created from ${formType} form submission. Details: ${JSON.stringify(payload).slice(0, 500)}`;

  let ownerId: string | undefined;
  const owner = await findUserByRole(mapping.ownerRole);
  if (owner) ownerId = owner.id;

  const dueDate =
    (payload.preferredDate as string) ??
    (payload.dueDate as string) ??
    undefined;

  const section =
    (payload.section as string) ?? mapping.section ?? undefined;

  const task = await dbCreateTask({
    title,
    description,
    type: mapping.type as Parameters<typeof dbCreateTask>[0]["type"],
    priority: mapping.priority as Parameters<typeof dbCreateTask>[0]["priority"],
    section: section as Parameters<typeof dbCreateTask>[0]["section"],
    ownerId,
    dueDate,
    sourceSystem:
      (event.sourceSystem as "FORM" | "EMAIL" | "MANUAL") ?? "FORM",
    sourceId:
      (payload.sourceId as string) ??
      (payload.responseId as string) ??
      `mock-${Date.now()}`,
  });

  await createLog({
    taskId: task.id,
    agentId: mapping.agentId,
    eventType: "INGEST_EVENT",
    rawEvent: event,
    actionDescription: `[Mock/${mapping.agentId}] Created task "${task.title}" [${task.type}/${task.priority}]${owner ? ` assigned to ${mapping.ownerRole} (${owner.name})` : ""}`,
    autoExecuted: true,
  });

  const summary = `Created task "${task.title}" with ${task.priority} priority as ${task.type}.${owner ? ` Assigned to ${owner.name} (${mapping.ownerRole}).` : ""}${dueDate ? ` Due date: ${dueDate}.` : ""} Routed via ${mapping.agentId} agent.`;

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
              section,
            },
          },
        ],
        text: summary,
      },
    ],
    toolCallCount: 1,
    agentId: mapping.agentId,
  };
}
