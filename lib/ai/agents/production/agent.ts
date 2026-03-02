import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { PRODUCTION_AGENT_PROMPT } from "./prompt";
import { productionTools } from "./tools";
import { buildSharedTools } from "@/lib/ai/shared/tools";
import type { SubAgentResult } from "@/lib/ai/shared/types";

const AGENT_ID = "PRODUCTION" as const;

export async function runProductionAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<SubAgentResult> {
  const sharedTools = buildSharedTools(AGENT_ID);
  const allTools = { ...productionTools, ...sharedTools };

  const userMessage = [
    "## Production Event",
    "```json",
    JSON.stringify(event, null, 2),
    "```",
    "",
    "## Context",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "",
    "Analyze this production event and take appropriate action using the available tools.",
  ].join("\n");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: PRODUCTION_AGENT_PROMPT,
    tools: allTools,
    stopWhen: stepCountIs(5),
    prompt: userMessage,
  });

  const toolCalls = result.steps.flatMap((step) => step.toolCalls ?? []);

  return {
    summary: result.text || "Production agent completed processing.",
    steps: result.steps.map((step, i) => ({
      stepNumber: i + 1,
      toolCalls: step.toolCalls ?? [],
      text: step.text ?? "",
    })),
    toolCallCount: toolCalls.length,
    agentId: AGENT_ID,
  };
}
