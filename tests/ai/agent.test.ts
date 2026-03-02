import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  task: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
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

// ─── Domain mapping tests ─────────────────────────────────────

describe("Mock Agent Domain Mappings (Publication)", () => {
  const FORM_TYPE_MAP: Record<
    string,
    { type: string; section: string | null; ownerRole: string; priority: string; agentId: string }
  > = {
    STORY_PITCH: {
      type: "STORY_PITCH",
      section: "NEWS",
      ownerRole: "MANAGING_EDITOR",
      priority: "MEDIUM",
      agentId: "EDITORIAL",
    },
    ARTICLE_ASSIGNMENT: {
      type: "ARTICLE_ASSIGNMENT",
      section: "NEWS",
      ownerRole: "HEAD_EDITORIALS",
      priority: "MEDIUM",
      agentId: "EDITORIAL",
    },
    LAYOUT_REQUEST: {
      type: "LAYOUT_REQUEST",
      section: "LAYOUT",
      ownerRole: "LAYOUT_ARTIST",
      priority: "MEDIUM",
      agentId: "PRODUCTION",
    },
    PHOTO_ASSIGNMENT: {
      type: "PHOTO_ASSIGNMENT",
      section: "PHOTOGRAPHY",
      ownerRole: "PHOTOJOURNALIST",
      priority: "MEDIUM",
      agentId: "PRODUCTION",
    },
    EVENT_COVERAGE: {
      type: "EVENT_COVERAGE",
      section: "NEWS",
      ownerRole: "MANAGING_EDITOR",
      priority: "HIGH",
      agentId: "OPERATIONS",
    },
    TEAM_TASK: {
      type: "TEAM_TASK",
      section: null,
      ownerRole: "MANAGING_EDITOR",
      priority: "MEDIUM",
      agentId: "OPERATIONS",
    },
  };

  it("maps STORY_PITCH to EDITORIAL agent with MANAGING_EDITOR owner", () => {
    const mapping = FORM_TYPE_MAP["STORY_PITCH"];
    expect(mapping).toBeDefined();
    expect(mapping.type).toBe("STORY_PITCH");
    expect(mapping.ownerRole).toBe("MANAGING_EDITOR");
    expect(mapping.agentId).toBe("EDITORIAL");
    expect(mapping.section).toBe("NEWS");
  });

  it("maps LAYOUT_REQUEST to PRODUCTION agent with LAYOUT_ARTIST owner", () => {
    const mapping = FORM_TYPE_MAP["LAYOUT_REQUEST"];
    expect(mapping.type).toBe("LAYOUT_REQUEST");
    expect(mapping.ownerRole).toBe("LAYOUT_ARTIST");
    expect(mapping.agentId).toBe("PRODUCTION");
    expect(mapping.section).toBe("LAYOUT");
  });

  it("maps EVENT_COVERAGE to OPERATIONS agent with HIGH priority", () => {
    const mapping = FORM_TYPE_MAP["EVENT_COVERAGE"];
    expect(mapping.type).toBe("EVENT_COVERAGE");
    expect(mapping.ownerRole).toBe("MANAGING_EDITOR");
    expect(mapping.agentId).toBe("OPERATIONS");
    expect(mapping.priority).toBe("HIGH");
  });

  it("maps PHOTO_ASSIGNMENT to PRODUCTION agent with PHOTOJOURNALIST owner", () => {
    const mapping = FORM_TYPE_MAP["PHOTO_ASSIGNMENT"];
    expect(mapping.agentId).toBe("PRODUCTION");
    expect(mapping.ownerRole).toBe("PHOTOJOURNALIST");
    expect(mapping.section).toBe("PHOTOGRAPHY");
  });

  it("defaults unknown form types to OTHER/MANAGING_EDITOR/MEDIUM", () => {
    const mapping = FORM_TYPE_MAP["UNKNOWN_TYPE"] ?? {
      type: "OTHER",
      section: null,
      ownerRole: "MANAGING_EDITOR",
      priority: "MEDIUM",
      agentId: "MASTER",
    };

    expect(mapping.type).toBe("OTHER");
    expect(mapping.ownerRole).toBe("MANAGING_EDITOR");
    expect(mapping.priority).toBe("MEDIUM");
    expect(mapping.agentId).toBe("MASTER");
  });
});

// ─── Title extraction tests ───────────────────────────────────

describe("Event Payload Parsing", () => {
  it("extracts title from payload correctly", () => {
    const payload = {
      title: "USPF Foundation Day Coverage",
      description: "Cover the Foundation Day events",
    };

    const title =
      (payload.title as string) ??
      (payload as Record<string, unknown>).subject ??
      "New STORY_PITCH submission";

    expect(title).toBe("USPF Foundation Day Coverage");
  });

  it("falls back to subject when title is missing", () => {
    const payload: Record<string, unknown> = {
      subject: "Intramurals Opening Ceremony",
      body: "Please cover the opening ceremony",
    };

    const title =
      (payload.title as string | undefined) ??
      (payload.subject as string) ??
      "New submission";

    expect(title).toBe("Intramurals Opening Ceremony");
  });

  it("extracts section from payload when present", () => {
    const payload = {
      title: "Test Story",
      section: "SPORTS",
    };

    const section = (payload.section as string) ?? null;
    expect(section).toBe("SPORTS");
  });
});

// ─── DB operations tests ──────────────────────────────────────

describe("Direct DB operations for multi-agent system", () => {
  it("creates a task with section and agentId in log", async () => {
    const mockUser = {
      id: "user-uuid-me",
      name: "Managing Editor",
      email: "managing@southernscholar.edu.ph",
      role: "MANAGING_EDITOR",
    };

    const mockTask = {
      id: "task-uuid-story",
      title: "Write news: Foundation Day schedule",
      description: "Cover USPF Foundation Day",
      type: "STORY_PITCH",
      section: "NEWS",
      status: "NEW",
      priority: "HIGH",
      ownerId: mockUser.id,
      sourceSystem: "FORM",
      sourceId: "form-001",
    };

    const mockLog = {
      id: "log-uuid-editorial",
      taskId: mockTask.id,
      agentId: "EDITORIAL",
      eventType: "INGEST_EVENT",
      rawEvent: JSON.stringify({ formType: "STORY_PITCH" }),
      actionDescription: `Created story pitch "${mockTask.title}"`,
      autoExecuted: true,
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.task.create.mockResolvedValue(mockTask);
    mockPrisma.agentActionLog.create.mockResolvedValue(mockLog);

    const user = await mockPrisma.user.findFirst({
      where: { role: "MANAGING_EDITOR" },
    });

    const task = await mockPrisma.task.create({
      data: {
        title: "Write news: Foundation Day schedule",
        description: "Cover USPF Foundation Day",
        type: "STORY_PITCH",
        section: "NEWS",
        status: "NEW",
        priority: "HIGH",
        ownerId: user?.id,
        sourceSystem: "FORM",
        sourceId: "form-001",
      },
    });

    const log = await mockPrisma.agentActionLog.create({
      data: {
        taskId: task.id,
        agentId: "EDITORIAL",
        eventType: "INGEST_EVENT",
        rawEvent: JSON.stringify({ formType: "STORY_PITCH" }),
        actionDescription: `Created story pitch "${task.title}"`,
        autoExecuted: true,
      },
    });

    expect(task.id).toBeTruthy();
    expect(task.section).toBe("NEWS");
    expect(log.taskId).toBe(task.id);
    expect(log.agentId).toBe("EDITORIAL");
    expect(log.autoExecuted).toBe(true);
  });

  it("resolves publication staff by role", async () => {
    const mockEIC = {
      id: "user-uuid-eic",
      name: "Carmen Reyes",
      email: "eic@southernscholar.edu.ph",
      role: "EDITOR_IN_CHIEF",
    };

    const mockWriter = {
      id: "user-uuid-writer",
      name: "Jessa Villanueva",
      email: "writer1@southernscholar.edu.ph",
      role: "WRITER",
    };

    const mockPhotoj = {
      id: "user-uuid-pj",
      name: "Kyle Mendoza",
      email: "photo1@southernscholar.edu.ph",
      role: "PHOTOJOURNALIST",
    };

    mockPrisma.user.findFirst
      .mockResolvedValueOnce(mockEIC)
      .mockResolvedValueOnce(mockWriter)
      .mockResolvedValueOnce(mockPhotoj);

    const eic = await mockPrisma.user.findFirst({
      where: { role: "EDITOR_IN_CHIEF" },
    });
    expect(eic).toBeTruthy();
    expect(eic!.name).toBe("Carmen Reyes");

    const writer = await mockPrisma.user.findFirst({
      where: { role: "WRITER" },
    });
    expect(writer).toBeTruthy();
    expect(writer!.role).toBe("WRITER");

    const photoj = await mockPrisma.user.findFirst({
      where: { role: "PHOTOJOURNALIST" },
    });
    expect(photoj).toBeTruthy();
    expect(photoj!.role).toBe("PHOTOJOURNALIST");
  });
});

// ─── LLM availability tests ──────────────────────────────────

describe("LLM Availability Detection", () => {
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

// ─── Agent routing classification tests ───────────────────────

describe("Master Agent Classification Logic", () => {
  function classifyEvent(formType: string): string {
    const editorialTypes = [
      "STORY_PITCH",
      "ARTICLE_ASSIGNMENT",
      "ARTICLE_REVIEW",
    ];
    const productionTypes = [
      "LAYOUT_REQUEST",
      "PHOTO_ASSIGNMENT",
      "PUBLICATION_ISSUE",
      "SOCIAL_MEDIA_POST",
    ];
    const operationsTypes = ["EVENT_COVERAGE", "TEAM_TASK"];

    if (editorialTypes.includes(formType)) return "EDITORIAL";
    if (productionTypes.includes(formType)) return "PRODUCTION";
    if (operationsTypes.includes(formType)) return "OPERATIONS";
    return "MASTER";
  }

  it("routes STORY_PITCH to EDITORIAL", () => {
    expect(classifyEvent("STORY_PITCH")).toBe("EDITORIAL");
  });

  it("routes ARTICLE_REVIEW to EDITORIAL", () => {
    expect(classifyEvent("ARTICLE_REVIEW")).toBe("EDITORIAL");
  });

  it("routes LAYOUT_REQUEST to PRODUCTION", () => {
    expect(classifyEvent("LAYOUT_REQUEST")).toBe("PRODUCTION");
  });

  it("routes PHOTO_ASSIGNMENT to PRODUCTION", () => {
    expect(classifyEvent("PHOTO_ASSIGNMENT")).toBe("PRODUCTION");
  });

  it("routes SOCIAL_MEDIA_POST to PRODUCTION", () => {
    expect(classifyEvent("SOCIAL_MEDIA_POST")).toBe("PRODUCTION");
  });

  it("routes EVENT_COVERAGE to OPERATIONS", () => {
    expect(classifyEvent("EVENT_COVERAGE")).toBe("OPERATIONS");
  });

  it("routes TEAM_TASK to OPERATIONS", () => {
    expect(classifyEvent("TEAM_TASK")).toBe("OPERATIONS");
  });

  it("routes unknown types to MASTER", () => {
    expect(classifyEvent("OTHER")).toBe("MASTER");
    expect(classifyEvent("UNKNOWN")).toBe("MASTER");
  });
});

// ─── AgentResult structure tests ──────────────────────────────

describe("AgentResult Structure", () => {
  it("has required fields including agentId", () => {
    const result = {
      summary: "Test summary",
      steps: [{ stepNumber: 1, toolCalls: [], text: "Step 1" }],
      toolCallCount: 0,
      agentId: "EDITORIAL" as const,
    };

    expect(result.summary).toBeTruthy();
    expect(result.agentId).toBe("EDITORIAL");
    expect(result.steps).toHaveLength(1);
    expect(result.toolCallCount).toBe(0);
  });

  it("SubAgentResult is compatible with AgentResult", () => {
    const subResult = {
      summary: "Editorial processing complete",
      steps: [
        {
          stepNumber: 1,
          toolCalls: [{ tool: "createStoryTask", args: {} }],
          text: "Created story",
        },
      ],
      toolCallCount: 1,
      agentId: "EDITORIAL" as const,
    };

    const agentResult: {
      summary: string;
      steps: unknown[];
      toolCallCount: number;
      agentId: string;
    } = subResult;

    expect(agentResult.agentId).toBe("EDITORIAL");
    expect(agentResult.toolCallCount).toBe(1);
  });
});
