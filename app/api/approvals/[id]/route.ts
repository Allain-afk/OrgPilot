import { NextResponse } from "next/server";
import { executeApproval, dismissApproval } from "@/lib/services/logs";

// POST /api/approvals/[id] — execute a pending approval
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = (body as Record<string, unknown>).action ?? "approve";

    if (action === "dismiss") {
      await dismissApproval(id);
      return NextResponse.json({ success: true, message: "Approval dismissed" });
    }

    const result = await executeApproval(id);
    return NextResponse.json({
      success: true,
      message: "Approval executed",
      result,
    });
  } catch (error) {
    console.error("[API/Approvals] POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to process approval",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
