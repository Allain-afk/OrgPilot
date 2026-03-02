import { tool } from "ai";
import { z } from "zod";
import {
  createTask as dbCreateTask,
  findUserByRole,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";
import { sectionEnum, priorityEnum } from "@/lib/ai/shared/tools";

const AGENT_ID = "PRODUCTION" as const;

// ─── createLayoutTask ───────────────────────────────────────────

export const createLayoutTaskTool = tool({
  description:
    "Create a layout/design task. Automatically targets the LAYOUT_ARTIST role.",
  inputSchema: z.object({
    title: z.string().describe("Layout task title, max 80 chars"),
    description: z
      .string()
      .describe("What needs to be designed — page spread, section, assets needed"),
    section: sectionEnum
      .optional()
      .describe("Publication section this layout is for"),
    priority: priorityEnum.describe("Priority level"),
    dueDate: z
      .string()
      .optional()
      .describe("ISO 8601 deadline for layout completion"),
    sourceSystem: z
      .enum(["FORM", "EMAIL", "MANUAL"])
      .describe("Origin system"),
    sourceId: z.string().describe("Unique ID from the source system"),
  }),
  execute: async (input) => {
    const layoutArtist = await findUserByRole("LAYOUT_ARTIST");

    const task = await dbCreateTask({
      title: input.title,
      description: input.description,
      type: "LAYOUT_REQUEST",
      priority: input.priority,
      section: input.section,
      ownerId: layoutArtist?.id,
      dueDate: input.dueDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created layout task "${task.title}"${input.section ? ` for ${input.section} section` : ""} [${task.priority}]${layoutArtist ? ` assigned to ${layoutArtist.name}` : ""}`,
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

// ─── assignPhotoCoverage ────────────────────────────────────────

export const assignPhotoCoverageTool = tool({
  description:
    "Create a photo assignment task and assign to a PHOTOJOURNALIST.",
  inputSchema: z.object({
    title: z.string().describe("Photo assignment title, max 80 chars"),
    description: z
      .string()
      .describe("What to photograph — event, subject, specific shots needed"),
    section: sectionEnum
      .optional()
      .describe("Publication section this is for (PHOTOGRAPHY if standalone)"),
    priority: priorityEnum.describe("Priority level"),
    dueDate: z
      .string()
      .optional()
      .describe("ISO 8601 deadline for photo delivery"),
    sourceSystem: z
      .enum(["FORM", "EMAIL", "MANUAL"])
      .describe("Origin system"),
    sourceId: z.string().describe("Unique ID from the source system"),
  }),
  execute: async (input) => {
    const pj = await findUserByRole("PHOTOJOURNALIST");

    const task = await dbCreateTask({
      title: input.title,
      description: input.description,
      type: "PHOTO_ASSIGNMENT",
      priority: input.priority,
      section: input.section ?? "PHOTOGRAPHY",
      ownerId: pj?.id,
      dueDate: input.dueDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created photo assignment "${task.title}" [${task.priority}]${pj ? ` assigned to ${pj.name}` : ""}`,
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

// ─── schedulePublication ────────────────────────────────────────

export const schedulePublicationTool = tool({
  description:
    "Create or update a PUBLICATION_ISSUE task to track an entire print or digital issue.",
  inputSchema: z.object({
    title: z
      .string()
      .describe("Issue title (e.g., 'Vol. 58 No. 1 — Foundation Day Issue')"),
    description: z
      .string()
      .describe("Issue details: theme, sections included, special notes"),
    priority: priorityEnum.describe("Priority level"),
    targetReleaseDate: z
      .string()
      .describe("ISO 8601 target release date"),
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
      type: "PUBLICATION_ISSUE",
      priority: input.priority,
      ownerId: managingEditor?.id,
      dueDate: input.targetReleaseDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Scheduled publication "${task.title}" for ${input.targetReleaseDate} [${task.priority}]${managingEditor ? ` managed by ${managingEditor.name}` : ""}`,
      autoExecuted: true,
    });

    return {
      success: true,
      taskId: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
      targetRelease: input.targetReleaseDate,
    };
  },
});

export const productionTools = {
  createLayoutTask: createLayoutTaskTool,
  assignPhotoCoverage: assignPhotoCoverageTool,
  schedulePublication: schedulePublicationTool,
};
