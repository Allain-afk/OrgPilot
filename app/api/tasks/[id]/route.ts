import { NextResponse } from "next/server";
import { getTaskById, updateTask } from "@/lib/services/tasks";

// GET /api/tasks/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[API/Tasks/id] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] — partial update
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    return NextResponse.json(task);
  } catch (error) {
    console.error("[API/Tasks/id] PATCH error:", error);
    return NextResponse.json(
      {
        error: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
