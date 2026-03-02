import type { AgentId } from "@/lib/types";

export interface AgentStepInfo {
  stepNumber: number;
  toolCalls: unknown[];
  text: string;
}

export interface AgentResult {
  summary: string;
  steps: AgentStepInfo[];
  toolCallCount: number;
  agentId: AgentId;
}

export interface SubAgentResult {
  summary: string;
  steps: AgentStepInfo[];
  toolCallCount: number;
  agentId: AgentId;
}
