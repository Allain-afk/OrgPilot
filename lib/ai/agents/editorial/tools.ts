import { tool } from "ai";
import { z } from "zod";
import {
  createTask as dbCreateTask,
  findUserByRole,
} from "@/lib/services/tasks";
import { createLog } from "@/lib/services/logs";
import {
  taskTypeEnum,
  sectionEnum,
  priorityEnum,
  userRoleEnum,
} from "@/lib/ai/shared/tools";

const AGENT_ID = "EDITORIAL" as const;

// ─── createStoryTask ────────────────────────────────────────────

export const createStoryTaskTool = tool({
  description:
    "Create a new story-related task (STORY_PITCH, ARTICLE_ASSIGNMENT, or ARTICLE_REVIEW). Always include the publication section.",
  inputSchema: z.object({
    title: z.string().describe("Action-oriented title, max 80 chars"),
    description: z
      .string()
      .describe("Detailed description with key facts from the event"),
    type: z
      .enum(["STORY_PITCH", "ARTICLE_ASSIGNMENT", "ARTICLE_REVIEW"])
      .describe("Editorial task type"),
    section: sectionEnum.describe("Publication section this story belongs to"),
    priority: priorityEnum.describe("Priority level"),
    suggestedOwnerRole: userRoleEnum
      .optional()
      .describe(
        "Role of the staff member who should own this task. If unsure, omit."
      ),
    dueDate: z
      .string()
      .optional()
      .describe("ISO 8601 date string if a deadline can be inferred"),
    sourceSystem: z
      .enum(["FORM", "EMAIL", "MANUAL"])
      .describe("Origin system"),
    sourceId: z.string().describe("Unique ID from the source system"),
  }),
  execute: async (input) => {
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
      section: input.section,
      ownerId,
      dueDate: input.dueDate,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
    });

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created ${input.type} "${task.title}" in ${input.section} section [${task.priority}]${ownerId ? ` assigned to ${input.suggestedOwnerRole}` : ""}`,
      autoExecuted: true,
    });

    return {
      success: true,
      taskId: task.id,
      title: task.title,
      type: task.type,
      section: input.section,
      status: task.status,
    };
  },
});

// ─── assignArticle ──────────────────────────────────────────────

export const assignArticleTool = tool({
  description:
    "Assign a WRITER to an article. Optionally pair with a PHOTOJOURNALIST for visual coverage.",
  inputSchema: z.object({
    taskId: z.string().describe("ID of the story task to assign"),
    writerRole: z
      .literal("WRITER")
      .default("WRITER")
      .describe("Always WRITER"),
    photojournalistNeeded: z
      .boolean()
      .optional()
      .describe("Whether a photojournalist should also be assigned"),
    notes: z
      .string()
      .optional()
      .describe("Assignment notes or angle for the writer"),
  }),
  execute: async (input) => {
    const writer = await findUserByRole("WRITER");
    if (!writer) {
      return { success: false, message: "No WRITER found in the system" };
    }

    const { assignTaskOwner: dbAssign } = await import(
      "@/lib/services/tasks"
    );
    const task = await dbAssign(input.taskId, writer.id);

    await createLog({
      taskId: task.id,
      agentId: AGENT_ID,
      eventType: "TASK_UPDATE",
      rawEvent: input,
      actionDescription: `Assigned article "${task.title}" to ${writer.name} (WRITER)${input.notes ? ` — ${input.notes}` : ""}`,
      autoExecuted: true,
    });

    let photoAssignment = null;
    if (input.photojournalistNeeded) {
      const pj = await findUserByRole("PHOTOJOURNALIST");
      if (pj) {
        photoAssignment = { id: pj.id, name: pj.name, role: pj.role };
        await createLog({
          taskId: task.id,
          agentId: AGENT_ID,
          eventType: "TASK_UPDATE",
          rawEvent: input,
          actionDescription: `Paired photojournalist ${pj.name} with article "${task.title}"`,
          autoExecuted: true,
        });
      }
    }

    return {
      success: true,
      taskId: task.id,
      title: task.title,
      assignedWriter: { id: writer.id, name: writer.name, role: writer.role },
      photoAssignment,
    };
  },
});

// ─── requestEditorialReview ─────────────────────────────────────

export const requestEditorialReviewTool = tool({
  description:
    "Queue an article for editorial review by the section head or EIC. Creates an ARTICLE_REVIEW task linked to the original story.",
  inputSchema: z.object({
    articleTaskId: z
      .string()
      .describe("ID of the original article/story task"),
    articleTitle: z.string().describe("Title of the article being reviewed"),
    section: sectionEnum.describe("Section the article belongs to"),
    reviewerRole: z
      .enum([
        "EDITOR_IN_CHIEF",
        "ASSOCIATE_EDITOR",
        "HEAD_EDITORIALS",
        "HEAD_FEATURES_MARKETING",
      ])
      .describe("Who should review this article"),
    notes: z
      .string()
      .optional()
      .describe("Review notes or specific areas to check"),
  }),
  execute: async (input) => {
    const reviewer = await findUserByRole(input.reviewerRole);
    const reviewTask = await dbCreateTask({
      title: `Review: ${input.articleTitle}`,
      description: `Editorial review needed for "${input.articleTitle}" in ${input.section} section.${input.notes ? ` Notes: ${input.notes}` : ""}`,
      type: "ARTICLE_REVIEW",
      priority: "HIGH",
      section: input.section,
      ownerId: reviewer?.id,
      sourceSystem: "MANUAL",
      sourceId: `review-${input.articleTaskId}`,
    });

    await createLog({
      taskId: reviewTask.id,
      agentId: AGENT_ID,
      eventType: "INGEST_EVENT",
      rawEvent: input,
      actionDescription: `Created editorial review task for "${input.articleTitle}" — assigned to ${input.reviewerRole}${reviewer ? ` (${reviewer.name})` : ""}`,
      autoExecuted: true,
    });

    return {
      success: true,
      reviewTaskId: reviewTask.id,
      originalTaskId: input.articleTaskId,
      reviewer: reviewer
        ? { id: reviewer.id, name: reviewer.name, role: reviewer.role }
        : null,
    };
  },
});

export const editorialTools = {
  createStoryTask: createStoryTaskTool,
  assignArticle: assignArticleTool,
  requestEditorialReview: requestEditorialReviewTool,
};
