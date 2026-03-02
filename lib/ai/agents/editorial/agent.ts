import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { EDITORIAL_AGENT_PROMPT } from "./prompt";
import { editorialTools } from "./tools";
import { buildSharedTools } from "@/lib/ai/shared/tools";
import type { SubAgentResult } from "@/lib/ai/shared/types";

const AGENT_ID = "EDITORIAL" as const;

export async function runEditorialAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<SubAgentResult> {
  const sharedTools = buildSharedTools(AGENT_ID);
  const allTools = { ...editorialTools, ...sharedTools };

  const userMessage = [
    "## Editorial Event",
    "```json",
    JSON.stringify(event, null, 2),
    "```",
    "",
    "## Context",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "",
    "Analyze this editorial event and take appropriate action using the available tools.",
  ].join("\n");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: EDITORIAL_AGENT_PROMPT,
    tools: allTools,
    stopWhen: stepCountIs(5),
    prompt: userMessage,
  });

  const toolCalls = result.steps.flatMap((step) => step.toolCalls ?? []);

  return {
    summary: result.text || "Editorial agent completed processing.",
    steps: result.steps.map((step, i) => ({
      stepNumber: i + 1,
      toolCalls: step.toolCalls ?? [],
      text: step.text ?? "",
    })),
    toolCallCount: toolCalls.length,
    agentId: AGENT_ID,
  };
}
