import { tool } from "ai";
import { z } from "zod";
import { runEditorialAgent } from "@/lib/ai/agents/editorial/agent";
import { runProductionAgent } from "@/lib/ai/agents/production/agent";
import { runOperationsAgent } from "@/lib/ai/agents/operations/agent";
import { createLog } from "@/lib/services/logs";
import { findUserByRole } from "@/lib/services/tasks";
import { makeLogAgentActionTool } from "@/lib/ai/shared/tools";

const AGENT_ID = "MASTER" as const;

// ─── delegateToEditorial ────────────────────────────────────────

export const delegateToEditorialTool = tool({
  description:
    "Delegate an event to the Editorial sub-agent for story, article, and editing workflows.",
  inputSchema: z.object({
    event: z.record(z.string(), z.unknown()).describe("The event data to pass to the Editorial agent"),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional context (existing tasks, etc.)"),
    reason: z
      .string()
      .describe("Why this event is classified as editorial"),
  }),
  execute: async (input) => {
    await createLog({
      agentId: AGENT_ID,
      eventType: "AGENT_REASONING",
      rawEvent: { delegation: "EDITORIAL", reason: input.reason },
      actionDescription: `Master delegated to Editorial Agent: ${input.reason}`,
      autoExecuted: true,
    });

    const result = await runEditorialAgent(
      input.event as Record<string, unknown>,
      (input.context as Record<string, unknown>) ?? {}
    );

    return {
      delegatedTo: "EDITORIAL",
      summary: result.summary,
      toolCallCount: result.toolCallCount,
      steps: result.steps.length,
    };
  },
});

// ─── delegateToProduction ───────────────────────────────────────

export const delegateToProductionTool = tool({
  description:
    "Delegate an event to the Production sub-agent for layout, photography, and publishing workflows.",
  inputSchema: z.object({
    event: z.record(z.string(), z.unknown()).describe("The event data to pass to the Production agent"),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional context (existing tasks, etc.)"),
    reason: z
      .string()
      .describe("Why this event is classified as production"),
  }),
  execute: async (input) => {
    await createLog({
      agentId: AGENT_ID,
      eventType: "AGENT_REASONING",
      rawEvent: { delegation: "PRODUCTION", reason: input.reason },
      actionDescription: `Master delegated to Production Agent: ${input.reason}`,
      autoExecuted: true,
    });

    const result = await runProductionAgent(
      input.event as Record<string, unknown>,
      (input.context as Record<string, unknown>) ?? {}
    );

    return {
      delegatedTo: "PRODUCTION",
      summary: result.summary,
      toolCallCount: result.toolCallCount,
      steps: result.steps.length,
    };
  },
});

// ─── delegateToOperations ───────────────────────────────────────

export const delegateToOperationsTool = tool({
  description:
    "Delegate an event to the Operations sub-agent for event coverage, team management, and admin workflows.",
  inputSchema: z.object({
    event: z.record(z.string(), z.unknown()).describe("The event data to pass to the Operations agent"),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional context (existing tasks, etc.)"),
    reason: z
      .string()
      .describe("Why this event is classified as operations"),
  }),
  execute: async (input) => {
    await createLog({
      agentId: AGENT_ID,
      eventType: "AGENT_REASONING",
      rawEvent: { delegation: "OPERATIONS", reason: input.reason },
      actionDescription: `Master delegated to Operations Agent: ${input.reason}`,
      autoExecuted: true,
    });

    const result = await runOperationsAgent(
      input.event as Record<string, unknown>,
      (input.context as Record<string, unknown>) ?? {}
    );

    return {
      delegatedTo: "OPERATIONS",
      summary: result.summary,
      toolCallCount: result.toolCallCount,
      steps: result.steps.length,
    };
  },
});

// ─── escalateToAdviser ──────────────────────────────────────────

export const escalateToAdviserTool = tool({
  description:
    "Escalate a sensitive or ambiguous event to the faculty adviser for review before processing. Use for content involving university admin, legal matters, controversial opinions, or budget decisions.",
  inputSchema: z.object({
    summary: z
      .string()
      .describe("Summary of the event and why it needs adviser review"),
    reason: z
      .string()
      .describe("Specific reason for escalation"),
    proposedAction: z
      .string()
      .optional()
      .describe("What action you recommend once approved"),
  }),
  execute: async (input) => {
    const adviser = await findUserByRole("ADVISER");

    const log = await createLog({
      agentId: AGENT_ID,
      eventType: "APPROVAL_REQUEST",
      rawEvent: input,
      actionDescription: `Escalated to Faculty Adviser: ${input.summary}. Reason: ${input.reason}`,
      autoExecuted: false,
      proposedChanges: {
        escalationType: "ADVISER_REVIEW",
        summary: input.summary,
        reason: input.reason,
        proposedAction: input.proposedAction,
        adviserId: adviser?.id,
      },
    });

    return {
      success: true,
      approvalId: log.id,
      adviser: adviser
        ? { id: adviser.id, name: adviser.name }
        : null,
      message: "Event escalated to faculty adviser for review.",
    };
  },
});

export const masterTools = {
  delegateToEditorial: delegateToEditorialTool,
  delegateToProduction: delegateToProductionTool,
  delegateToOperations: delegateToOperationsTool,
  escalateToAdviser: escalateToAdviserTool,
  logAgentAction: makeLogAgentActionTool(AGENT_ID),
};
