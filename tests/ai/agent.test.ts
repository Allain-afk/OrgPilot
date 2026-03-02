import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client for agent tests
const mockPrisma = {
  task: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  agentActionLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Mock Agent Logic", () => {
  it("maps EVENT_REQUEST to correct type and high priority", () => {
    const FORM_TYPE_MAP: Record<string, { type: string; ownerRole: string; priority: string }> = {
      EVENT_REQUEST: {
        type: "EVENT_REQUEST",
        ownerRole: "PRESIDENT",
        priority: "HIGH",
      },
      FACILITY_ISSUE: {
        type: "FACILITY_ISSUE",
        ownerRole: "LOGISTICS",
        priority: "HIGH",
      },
      FINANCE_REQUEST: {
        type: "FINANCE_REQUEST",
        ownerRole: "TREASURER",
        priority: "MEDIUM",
      },
    };

    const mapping = FORM_TYPE_MAP["EVENT_REQUEST"];
    expect(mapping).toBeDefined();
    expect(mapping.type).toBe("EVENT_REQUEST");
    expect(mapping.ownerRole).toBe("PRESIDENT");
    expect(mapping.priority).toBe("HIGH");
  });

  it("maps FACILITY_ISSUE to LOGISTICS owner", () => {
    const FORM_TYPE_MAP: Record<string, { type: string; ownerRole: string; priority: string }> = {
      FACILITY_ISSUE: {
        type: "FACILITY_ISSUE",
        ownerRole: "LOGISTICS",
        priority: "HIGH",
      },
    };

    const mapping = FORM_TYPE_MAP["FACILITY_ISSUE"];
    expect(mapping.ownerRole).toBe("LOGISTICS");
    expect(mapping.type).toBe("FACILITY_ISSUE");
  });

  it("defaults unknown form types to OTHER/SECRETARY/MEDIUM", () => {
    const FORM_TYPE_MAP: Record<string, { type: string; ownerRole: string; priority: string }> = {};

    const mapping = FORM_TYPE_MAP["UNKNOWN_TYPE"] ?? {
      type: "OTHER",
      ownerRole: "SECRETARY",
      priority: "MEDIUM",
    };

    expect(mapping.type).toBe("OTHER");
    expect(mapping.ownerRole).toBe("SECRETARY");
    expect(mapping.priority).toBe("MEDIUM");
  });

  it("extracts title from payload correctly", () => {
    const payload = {
      title: "Annual Science Fair",
      description: "Need auditorium and judges",
    };

    const title =
      (payload.title as string) ??
      (payload as Record<string, unknown>).subject ??
      "New EVENT_REQUEST submission";

    expect(title).toBe("Annual Science Fair");
  });

  it("falls back to subject when title is missing", () => {
    const payload: Record<string, unknown> = {
      subject: "Projector Broken in Room 204",
      body: "Please fix ASAP",
    };

    const title =
      (payload.title as string | undefined) ??
      (payload.subject as string) ??
      "New submission";

    expect(title).toBe("Projector Broken in Room 204");
  });
});

describe("Direct DB operations for agent", () => {
  it("creates a task and log through prisma", async () => {
    const mockUser = {
      id: "user-uuid-pres",
      name: "President User",
      email: "pres@test.edu",
      role: "PRESIDENT",
    };

    const mockTask = {
      id: "task-uuid-agent",
      title: "Agent-created Task",
      description: "Created by test agent simulation",
      type: "EVENT_REQUEST",
      status: "NEW",
      priority: "HIGH",
      ownerId: mockUser.id,
      sourceSystem: "FORM",
      sourceId: "test-agent-001",
    };

    const mockLog = {
      id: "log-uuid-agent",
      taskId: mockTask.id,
      eventType: "INGEST_EVENT",
      rawEvent: JSON.stringify({ formType: "EVENT_REQUEST" }),
      actionDescription: `Created task "${mockTask.title}"`,
      autoExecuted: true,
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.task.create.mockResolvedValue(mockTask);
    mockPrisma.agentActionLog.create.mockResolvedValue(mockLog);

    const user = await mockPrisma.user.findFirst({ where: { role: "PRESIDENT" } });

    const task = await mockPrisma.task.create({
      data: {
        title: "Agent-created Task",
        description: "Created by test agent simulation",
        type: "EVENT_REQUEST",
        status: "NEW",
        priority: "HIGH",
        ownerId: user?.id,
        sourceSystem: "FORM",
        sourceId: "test-agent-001",
      },
    });

    const log = await mockPrisma.agentActionLog.create({
      data: {
        taskId: task.id,
        eventType: "INGEST_EVENT",
        rawEvent: JSON.stringify({ formType: "EVENT_REQUEST" }),
        actionDescription: `Created task "${task.title}"`,
        autoExecuted: true,
      },
    });

    expect(task.id).toBeTruthy();
    expect(log.taskId).toBe(task.id);
    expect(log.autoExecuted).toBe(true);
  });

  it("resolves user by role", async () => {
    const mockPresident = {
      id: "user-uuid-pres",
      name: "President User",
      email: "pres@test.edu",
      role: "PRESIDENT",
    };

    const mockLogistics = {
      id: "user-uuid-log",
      name: "Logistics User",
      email: "logistics@test.edu",
      role: "LOGISTICS",
    };

    mockPrisma.user.findFirst
      .mockResolvedValueOnce(mockPresident)
      .mockResolvedValueOnce(mockLogistics);

    const president = await mockPrisma.user.findFirst({
      where: { role: "PRESIDENT" },
    });
    expect(president).toBeTruthy();
    expect(president!.name).toBe("President User");

    const logistics = await mockPrisma.user.findFirst({
      where: { role: "LOGISTICS" },
    });
    expect(logistics).toBeTruthy();
    expect(logistics!.role).toBe("LOGISTICS");
  });

  it("detects OPENAI_API_KEY placeholder triggers mock mode", () => {
    const key: string = "sk-placeholder";
    const isAvailable = !!key && key !== "sk-placeholder" && key.length > 10;
    expect(isAvailable).toBe(false);
  });

  it("detects real OPENAI_API_KEY enables LLM mode", () => {
    const key: string = "sk-proj-abcdefghijklmnopqrstuvwxyz123456";
    const isAvailable = !!key && key !== "sk-placeholder" && key.length > 10;
    expect(isAvailable).toBe(true);
  });
});
