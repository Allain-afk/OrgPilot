import { tool } from "ai";
import { z } from "zod";
import {
  createTask as dbCreateTask,
  findUserByRole,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";
import { sectionEnum, priorityEnum } from "@/lib/ai/shared/tools";

const AGENT_ID = "OPERATIONS" as const;

// ─── createCoverageTask ─────────────────────────────────────────

export const createCoverageTaskTool = tool({
  description:
    "Create an EVENT_COVERAGE task for a campus event that needs publication coverage.",
  inputSchema: z.object({
    title: z.string().describe("Coverage task title, max 80 chars"),
    description: z
      .string()
      .describe("Event details: what, when, where, why coverage is needed"),
    section: sectionEnum
      .optional()
      .describe("Primary section for the coverage (NEWS, SPORTS, etc.)"),
    priority: priorityEnum.describe("Priority level"),
    eventDate: z
      .string()
      .optional()
      .describe("ISO 8601 date of the event to cover"),
    sourceSystem: z
      .enum(["FORM", "EMAIL", "MANUAL"])
      .describe("Origin system"),
    sourceId: z.string().describe("Unique ID from the source system"),
  }),
  execute: async (input) => {
    const managingEditor = await findUserByRole("MANAGING_EDITOR");

    const task = await dbCreateTask({
      title: input.title,
      description: input.description,
      type: "EVENT_COVERAGE",
      priority: input.priority,
      section: input.section ?? "NEWS",
      ownerId: managingEditor?.id,
      dueDate: input.eventDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created event coverage task "${task.title}"${input.section ? ` for ${input.section}` : ""} [${task.priority}]${managingEditor ? ` coordinated by ${managingEditor.name}` : ""}`,
      autoExecuted: true,
    });

    return {
      success: true,
      taskId: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
    };
  },
});

// ─── manageTeamTask ─────────────────────────────────────────────

export const manageTeamTaskTool = tool({
  description:
    "Create a TEAM_TASK for internal org operations: onboarding, meetings, training, scheduling.",
  inputSchema: z.object({
    title: z.string().describe("Team task title, max 80 chars"),
    description: z
      .string()
      .describe("What needs to happen and who is involved"),
    priority: priorityEnum.describe("Priority level"),
    suggestedOwnerRole: z
      .enum([
        "MANAGING_EDITOR",
        "EDITOR_IN_CHIEF",
        "ASSOCIATE_EDITOR",
        "HEAD_EDITORIALS",
        "HEAD_FEATURES_MARKETING",
      ])
      .optional()
      .describe("Who should own this task (defaults to MANAGING_EDITOR)"),
    dueDate: z
      .string()
      .optional()
      .describe("ISO 8601 deadline"),
    sourceSystem: z
      .enum(["FORM", "EMAIL", "MANUAL"])
      .describe("Origin system"),
    sourceId: z.string().describe("Unique ID from the source system"),
  }),
  execute: async (input) => {
    const role = input.suggestedOwnerRole ?? "MANAGING_EDITOR";
    const owner = await findUserByRole(role);

    const task = await dbCreateTask({
      title: input.title,
      description: input.description,
      type: "TEAM_TASK",
      priority: input.priority,
      ownerId: owner?.id,
      dueDate: input.dueDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created team task "${task.title}" [${task.priority}]${owner ? ` assigned to ${role} (${owner.name})` : ""}`,
      autoExecuted: true,
    });

    return {
      success: true,
      taskId: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
    };
  },
});

// ─── coordinateEvent ────────────────────────────────────────────

export const coordinateEventTool = tool({
  description:
    "Create a set of checklist sub-tasks for event coverage: pre-event prep, during-event coverage, and post-event deliverables.",
  inputSchema: z.object({
    eventTitle: z.string().describe("Name of the event"),
    eventDate: z.string().describe("ISO 8601 date of the event"),
    section: sectionEnum
      .optional()
      .describe("Primary section for coverage"),
    parentTaskId: z
      .string()
      .optional()
      .describe("ID of the parent EVENT_COVERAGE task, if one exists"),
    sourceId: z.string().describe("Unique source ID for grouping"),
  }),
  execute: async (input) => {
    const writer = await findUserByRole("WRITER");
    const pj = await findUserByRole("PHOTOJOURNALIST");
    const section = input.section ?? "NEWS";

    const preEvent = await dbCreateTask({
      title: `Pre-event: Prepare for ${input.eventTitle}`,
      description: `Confirm schedule, prepare interview questions, obtain press credentials for ${input.eventTitle} on ${input.eventDate}.`,
      type: "EVENT_COVERAGE",
      priority: "HIGH",
      section,
      ownerId: writer?.id,
      dueDate: input.eventDate,
      sourceSystem: "MANUAL",
      sourceId: `${input.sourceId}-pre`,
    });

    const duringEvent = await dbCreateTask({
      title: `Coverage: Attend ${input.eventTitle}`,
      description: `Attend and report on ${input.eventTitle}. Take notes, conduct interviews, capture key moments.`,
      type: "EVENT_COVERAGE",
      priority: "HIGH",
      section,
      ownerId: writer?.id,
      dueDate: input.eventDate,
      sourceSystem: "MANUAL",
      sourceId: `${input.sourceId}-during`,
    });

    const postEvent = await dbCreateTask({
      title: `Post-event: Submit ${input.eventTitle} draft and photos`,
      description: `Submit article draft and photos from ${input.eventTitle} coverage within 48 hours of the event.`,
      type: "EVENT_COVERAGE",
      priority: "HIGH",
      section,
      ownerId: writer?.id,
      sourceSystem: "MANUAL",
      sourceId: `${input.sourceId}-post`,
    });

    const taskIds = [preEvent.id, duringEvent.id, postEvent.id];

    await createLog({
      taskId: input.parentTaskId,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created 3 coverage checklist tasks for "${input.eventTitle}": pre-event, during, post-event${writer ? ` — writer: ${writer.name}` : ""}${pj ? `, photojournalist: ${pj.name}` : ""}`,
      autoExecuted: true,
    });

    return {
      success: true,
      checklistTaskIds: taskIds,
      eventTitle: input.eventTitle,
      assignedWriter: writer
        ? { id: writer.id, name: writer.name }
        : null,
      assignedPhotojournalist: pj
        ? { id: pj.id, name: pj.name }
        : null,
    };
  },
});

export const operationsTools = {
  createCoverageTask: createCoverageTaskTool,
  manageTeamTask: manageTeamTaskTool,
  coordinateEvent: coordinateEventTool,
};
