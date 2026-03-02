import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { ORGPILOT_SYSTEM_PROMPT } from "./prompt";
import { agentTools } from "./tools";
import { runMockAgent, type AgentResult } from "./mock-agent";

// ─── Check if real LLM is available ────────────────────────────
function isLLMAvailable(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key !== "sk-placeholder" && key.length > 10;
}

// ─── Main agent entry point ────────────────────────────────────
export async function runAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<AgentResult> {
  // Fallback to mock agent if no API key
  if (!isLLMAvailable()) {
    console.log("[Agent] No valid OPENAI_API_KEY — using mock agent");
    return runMockAgent(event, context);
  }

  console.log("[Agent] Running with OpenAI LLM...");

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
    "Analyze this event and take appropriate action using the available tools.",
  ].join("\n");

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: ORGPILOT_SYSTEM_PROMPT,
      tools: agentTools,
      stopWhen: stepCountIs(5),
      prompt: userMessage,
    });

    const toolCalls = result.steps.flatMap((step) => step.toolCalls ?? []);

    return {
      summary: result.text || "Agent completed processing.",
      steps: result.steps.map((step, i) => ({
        stepNumber: i + 1,
        toolCalls: step.toolCalls ?? [],
        text: step.text ?? "",
      })),
      toolCallCount: toolCalls.length,
    };
  } catch (error) {
    console.error("[Agent] LLM call failed, falling back to mock:", error);
    return runMockAgent(event, context);
  }
}
