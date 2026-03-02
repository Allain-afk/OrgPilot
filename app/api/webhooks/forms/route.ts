import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai/agent";
import { findTasksBySourceId } from "@/lib/services/tasks";

const KNOWN_FORM_TYPES = [
  "STORY_PITCH",
  "ARTICLE_ASSIGNMENT",
  "ARTICLE_REVIEW",
  "LAYOUT_REQUEST",
  "PHOTO_ASSIGNMENT",
  "EVENT_COVERAGE",
  "PUBLICATION_ISSUE",
  "SOCIAL_MEDIA_POST",
  "TEAM_TASK",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { formType, payload } = body as {
      formType?: string;
      payload?: Record<string, unknown>;
    };

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid 'payload' in request body" },
        { status: 400 }
      );
    }

    const normalizedFormType =
      formType && KNOWN_FORM_TYPES.includes(formType) ? formType : "OTHER";

    const event = {
      formType: normalizedFormType,
      payload,
      sourceSystem: "FORM" as const,
      receivedAt: new Date().toISOString(),
    };

    const sourceId =
      (payload.sourceId as string) ??
      (payload.responseId as string) ??
      "";
    const existingTasks = sourceId
      ? await findTasksBySourceId(sourceId)
      : [];

    const result = await runAgent(event, { existingTasks });

    return NextResponse.json({
      success: true,
      summary: result.summary,
      agentId: result.agentId,
      toolCallCount: result.toolCallCount,
    });
  } catch (error) {
    console.error("[Webhook/Forms] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
