import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai/agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, context } = body as {
      event?: Record<string, unknown>;
      context?: Record<string, unknown>;
    };

    if (!event || typeof event !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid 'event' in request body" },
        { status: 400 }
      );
    }

    const result = await runAgent(event, context ?? {});

    return NextResponse.json({
      success: true,
      summary: result.summary,
      agentId: result.agentId,
      steps: result.steps,
      toolCallCount: result.toolCallCount,
    });
  } catch (error) {
    console.error("[Agent/Process] Error:", error);
    return NextResponse.json(
      {
        error: "Agent processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
