import { runMasterAgent } from "./master/agent";
import { runMockAgent } from "./mock-agent";
import type { AgentResult } from "./shared/types";

export type { AgentResult };

function isLLMAvailable(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key !== "sk-placeholder" && key.length > 10;
}

export async function runAgent(
  event: Record<string, unknown>,
  context: Record<string, unknown> = {}
): Promise<AgentResult> {
  if (!isLLMAvailable()) {
    console.log("[Agent] No valid OPENAI_API_KEY — using mock agent");
    return runMockAgent(event, context);
  }

  console.log("[Agent] Running multi-agent system via Master Agent...");

  try {
    return await runMasterAgent(event, context);
  } catch (error) {
    console.error("[Agent] Master agent failed, falling back to mock:", error);
    return runMockAgent(event, context);
  }
}
