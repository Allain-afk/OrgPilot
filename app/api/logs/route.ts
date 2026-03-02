import { NextRequest, NextResponse } from "next/server";
import { getRecentLogs, getPendingApprovals } from "@/lib/services/logs";

// GET /api/logs?type=APPROVAL_REQUEST&pending=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type");
    const pending = searchParams.get("pending");

    if (type === "APPROVAL_REQUEST" && pending === "true") {
      const approvals = await getPendingApprovals();
      return NextResponse.json(approvals);
    }

    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const logs = await getRecentLogs(limit);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API/Logs] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
