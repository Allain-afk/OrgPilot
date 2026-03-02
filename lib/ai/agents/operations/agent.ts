import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { OPERATIONS_AGENT_PROMPT } from "./prompt";
import { operationsTools } from "./tools";
import { buildSharedTools } from "@/lib/ai/shared/tools";
import type { SubAgentResult } from "@/lib/ai/shared/types";

const AGENT_ID = "OPERATIONS" as const;

export async function runOperationsAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<SubAgentResult> {
  const sharedTools = buildSharedTools(AGENT_ID);
  const allTools = { ...operationsTools, ...sharedTools };

  const userMessage = [
    "## Operations Event",
    "```json",
    JSON.stringify(event, null, 2),
    "```",
    "",
    "## Context",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "",
    "Analyze this operations event and take appropriate action using the available tools.",
  ].join("\n");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: OPERATIONS_AGENT_PROMPT,
    tools: allTools,
    stopWhen: stepCountIs(5),
    prompt: userMessage,
  });

  const toolCalls = result.steps.flatMap((step) => step.toolCalls ?? []);

  return {
    summary: result.text || "Operations agent completed processing.",
    steps: result.steps.map((step, i) => ({
      stepNumber: i + 1,
      toolCalls: step.toolCalls ?? [],
      text: step.text ?? "",
    })),
    toolCallCount: toolCalls.length,
    agentId: AGENT_ID,
  };
}
