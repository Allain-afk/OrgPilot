import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, createTask } from "@/lib/services/tasks";
import type { TaskStatus, TaskType } from "@/lib/types";

// GET /api/tasks?status=NEW&type=EVENT_REQUEST&ownerId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const filters = {
      status: (searchParams.get("status") as TaskStatus) || undefined,
      type: (searchParams.get("type") as TaskType) || undefined,
      ownerId: searchParams.get("ownerId") || undefined,
    };

    const tasks = await getAllTasks(filters);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[API/Tasks] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks — manual task creation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const task = await createTask(body);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[API/Tasks] POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
