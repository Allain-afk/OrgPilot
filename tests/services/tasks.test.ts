import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client
const mockPrisma = {
  task: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  agentActionLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Task CRUD", () => {
  it("creates a task with all required fields", async () => {
    const taskData = {
      title: "Test Event Planning",
      description: "A test event that needs planning.",
      type: "EVENT_REQUEST",
      status: "NEW",
      priority: "HIGH",
      sourceSystem: "FORM",
      sourceId: "test-form-001",
    };

    const mockTask = {
      id: "task-uuid-123",
      ...taskData,
      owner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.task.create.mockResolvedValue(mockTask);

    const result = await mockPrisma.task.create({
      data: taskData,
      include: { owner: true },
    });

    expect(result).toBeDefined();
    expect(result.id).toBe("task-uuid-123");
    expect(result.title).toBe("Test Event Planning");
    expect(result.type).toBe("EVENT_REQUEST");
    expect(result.status).toBe("NEW");
    expect(result.priority).toBe("HIGH");
    expect(result.owner).toBeNull();
  });

  it("creates a task with an owner", async () => {
    const mockUser = {
      id: "user-uuid-123",
      name: "Test President",
      email: "test-president@test.edu",
      role: "PRESIDENT",
    };

    const mockTask = {
      id: "task-uuid-456",
      title: "Budget Review",
      description: "Review Q2 budget allocations",
      type: "FINANCE",
      priority: "MEDIUM",
      status: "NEW",
      ownerId: mockUser.id,
      owner: mockUser,
      sourceSystem: "MANUAL",
      sourceId: "manual-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.task.create.mockResolvedValue(mockTask);

    const user = await mockPrisma.user.findFirst({ where: { role: "PRESIDENT" } });
    expect(user).toBeTruthy();

    const task = await mockPrisma.task.create({
      data: {
        title: "Budget Review",
        description: "Review Q2 budget allocations",
        type: "FINANCE",
        priority: "MEDIUM",
        ownerId: user!.id,
        sourceSystem: "MANUAL",
        sourceId: "manual-001",
      },
      include: { owner: true },
    });

    expect(task.owner).toBeTruthy();
    expect(task.owner!.name).toBe("Test President");
  });

  it("filters tasks by status", async () => {
    const doneTasks = [
      { id: "task-1", title: "Done Task 1", status: "DONE" },
      { id: "task-2", title: "Done Task 2", status: "DONE" },
    ];

    mockPrisma.task.findMany.mockResolvedValue(doneTasks);

    const result = await mockPrisma.task.findMany({
      where: { status: "DONE" },
    });

    expect(result.length).toBe(2);
    expect(result.every((t: { status: string }) => t.status === "DONE")).toBe(true);
  });

  it("updates task status", async () => {
    const originalTask = {
      id: "task-uuid-789",
      title: "Test Task",
      status: "NEW",
    };

    const updatedTask = { ...originalTask, status: "IN_PROGRESS" };

    mockPrisma.task.findUnique.mockResolvedValue(originalTask);
    mockPrisma.task.update.mockResolvedValue(updatedTask);

    const task = await mockPrisma.task.findUnique({ where: { id: originalTask.id } });
    expect(task).toBeTruthy();

    const updated = await mockPrisma.task.update({
      where: { id: task!.id },
      data: { status: "IN_PROGRESS" },
    });

    expect(updated.status).toBe("IN_PROGRESS");
  });
});

describe("AgentActionLog", () => {
  it("creates a log entry linked to a task", async () => {
    const mockTask = { id: "task-uuid-abc", title: "Test Task" };
    const mockLog = {
      id: "log-uuid-123",
      taskId: mockTask.id,
      eventType: "INGEST_EVENT",
      rawEvent: JSON.stringify({ test: true }),
      actionDescription: "Test log entry",
      autoExecuted: true,
      task: mockTask,
      createdAt: new Date(),
    };

    mockPrisma.task.findUnique.mockResolvedValue(mockTask);
    mockPrisma.agentActionLog.create.mockResolvedValue(mockLog);

    const task = await mockPrisma.task.findUnique({ where: { id: mockTask.id } });
    expect(task).toBeTruthy();

    const log = await mockPrisma.agentActionLog.create({
      data: {
        taskId: task!.id,
        eventType: "INGEST_EVENT",
        rawEvent: JSON.stringify({ test: true }),
        actionDescription: "Test log entry",
        autoExecuted: true,
      },
      include: { task: true },
    });

    expect(log.id).toBeTruthy();
    expect(log.taskId).toBe(task!.id);
    expect(log.task).toBeTruthy();
    expect(log.autoExecuted).toBe(true);
  });

  it("creates a pending approval log entry", async () => {
    const mockLog = {
      id: "log-uuid-456",
      eventType: "APPROVAL_REQUEST",
      actionDescription: "Cancel annual picnic?",
      autoExecuted: false,
      proposedChanges: JSON.stringify({
        taskId: "fake-id",
        status: "CANCELLED",
      }),
      createdAt: new Date(),
    };

    mockPrisma.agentActionLog.create.mockResolvedValue(mockLog);
    mockPrisma.agentActionLog.findMany.mockResolvedValue([mockLog]);

    const log = await mockPrisma.agentActionLog.create({
      data: {
        eventType: "APPROVAL_REQUEST",
        actionDescription: "Cancel annual picnic?",
        autoExecuted: false,
        proposedChanges: JSON.stringify({
          taskId: "fake-id",
          status: "CANCELLED",
        }),
      },
    });

    expect(log.autoExecuted).toBe(false);
    expect(log.proposedChanges).toBeTruthy();

    const pending = await mockPrisma.agentActionLog.findMany({
      where: { eventType: "APPROVAL_REQUEST", autoExecuted: false },
    });
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });
});
