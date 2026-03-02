import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { MASTER_AGENT_PROMPT } from "./prompt";
import { masterTools } from "./tools";
import type { AgentResult } from "@/lib/ai/shared/types";

export async function runMasterAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<AgentResult> {
  const userMessage = [
    "## Incoming Event",
    "```json",
    JSON.stringify(event, null, 2),
    "```",
    "",
    "## Current Context (existing related tasks, if any)",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "",
    "Classify this event and delegate to the appropriate sub-agent(s) using the available tools.",
  ].join("\n");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: MASTER_AGENT_PROMPT,
    tools: masterTools,
    stopWhen: stepCountIs(6),
    prompt: userMessage,
  });

  const toolCalls = result.steps.flatMap((step) => step.toolCalls ?? []);

  return {
    summary: result.text || "Master agent completed event routing.",
    steps: result.steps.map((step, i) => ({
      stepNumber: i + 1,
      toolCalls: step.toolCalls ?? [],
      text: step.text ?? "",
    })),
    toolCallCount: toolCalls.length,
    agentId: "MASTER",
  };
}
