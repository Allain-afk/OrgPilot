import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateUrl = process.env.DATABASE_URL;
if (!accelerateUrl) {
  console.error("DATABASE_URL must be set for Prisma Accelerate");
  process.exit(1);
}

const prisma = new PrismaClient({ accelerateUrl }).$extends(withAccelerate());

async function main() {
  console.log("Seeding database for The Southern Scholar (USPF)...");

  // ─── Staff members ─────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "eic@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Carmen Reyes",
        email: "eic@southernscholar.edu.ph",
        role: "EDITOR_IN_CHIEF",
      },
    }),
    prisma.user.upsert({
      where: { email: "assoc.editor@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Marco Santos",
        email: "assoc.editor@southernscholar.edu.ph",
        role: "ASSOCIATE_EDITOR",
      },
    }),
    prisma.user.upsert({
      where: { email: "managing@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Alyssa Tan",
        email: "managing@southernscholar.edu.ph",
        role: "MANAGING_EDITOR",
      },
    }),
    prisma.user.upsert({
      where: { email: "editorials@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Rafael Cruz",
        email: "editorials@southernscholar.edu.ph",
        role: "HEAD_EDITORIALS",
      },
    }),
    prisma.user.upsert({
      where: { email: "features@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Isabelle Lim",
        email: "features@southernscholar.edu.ph",
        role: "HEAD_FEATURES_MARKETING",
      },
    }),
    prisma.user.upsert({
      where: { email: "writer1@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Jessa Villanueva",
        email: "writer1@southernscholar.edu.ph",
        role: "WRITER",
      },
    }),
    prisma.user.upsert({
      where: { email: "photo1@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Kyle Mendoza",
        email: "photo1@southernscholar.edu.ph",
        role: "PHOTOJOURNALIST",
      },
    }),
    prisma.user.upsert({
      where: { email: "layout@southernscholar.edu.ph" },
      update: {},
      create: {
        name: "Trisha Garcia",
        email: "layout@southernscholar.edu.ph",
        role: "LAYOUT_ARTIST",
      },
    }),
    prisma.user.upsert({
      where: { email: "adviser@uspf.edu.ph" },
      update: {},
      create: {
        name: "Prof. Elena Fernandez",
        email: "adviser@uspf.edu.ph",
        role: "ADVISER",
      },
    }),
    prisma.user.upsert({
      where: { email: "alegaspi_ccs@uspf.edu.ph" },
      update: {},
      create: {
        id: "mock-observer-001",
        name: "Allain Legaspi",
        email: "alegaspi_ccs@uspf.edu.ph",
        role: "ADMIN",
      },
    }),
  ]);

  const [eic, _assoc, managing, headEdit, headFeatures, writer, photoj, layout] = users;

  console.log(`  Created ${users.length} staff members`);

  // ─── Sample tasks ───────────────────────────────────────────
  const task1 = await prisma.task.create({
    data: {
      title: "Write news article: USPF Foundation Day schedule",
      description:
        "Cover the upcoming USPF Foundation Day celebrations. Include schedule of events, keynote speaker info, and student org activities. Coordinate with admin office for official programme.",
      type: "STORY_PITCH",
      section: "NEWS",
      status: "NEW",
      priority: "HIGH",
      ownerId: headEdit.id,
      dueDate: new Date("2026-04-01"),
      sourceSystem: "FORM",
      sourceId: "form-resp-001",
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Photo coverage: Intramurals Opening Ceremony",
      description:
        "Full photo coverage of the USPF Intramurals 2026 opening ceremony at the main gymnasium. Capture team presentations, torch lighting, and opening remarks.",
      type: "PHOTO_ASSIGNMENT",
      section: "SPORTS",
      status: "IN_PROGRESS",
      priority: "HIGH",
      ownerId: photoj.id,
      sourceSystem: "MANUAL",
      sourceId: "manual-002",
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Layout: Vol. 58 No. 1 — News section spread",
      description:
        "Design the news section spread (pages 2-5) for the first issue of Volume 58. Three articles confirmed, awaiting final photos from photojournalist.",
      type: "LAYOUT_REQUEST",
      section: "LAYOUT",
      status: "NEW",
      priority: "MEDIUM",
      ownerId: layout.id,
      dueDate: new Date("2026-04-10"),
      sourceSystem: "MANUAL",
      sourceId: "manual-003",
    },
  });

  console.log("  Created 3 sample tasks");

  // ─── Agent action logs ──────────────────────────────────────
  await prisma.agentActionLog.create({
    data: {
      taskId: task1.id,
      agentId: "EDITORIAL",
      eventType: "INGEST_EVENT",
      rawEvent: JSON.stringify({
        formType: "STORY_PITCH",
        payload: {
          title: "USPF Foundation Day schedule",
          section: "NEWS",
        },
      }),
      actionDescription:
        'Editorial Agent created story pitch "Write news article: USPF Foundation Day schedule" in NEWS section. Assigned to Head for Editorials (Rafael Cruz) with HIGH priority.',
      autoExecuted: true,
    },
  });

  await prisma.agentActionLog.create({
    data: {
      taskId: task2.id,
      agentId: "PRODUCTION",
      eventType: "TASK_UPDATE",
      rawEvent: JSON.stringify({
        source: "manual",
        subject: "Intramurals photo coverage",
      }),
      actionDescription:
        'Production Agent assigned photo coverage "Intramurals Opening Ceremony" to Kyle Mendoza (PHOTOJOURNALIST). Status: IN_PROGRESS.',
      autoExecuted: true,
    },
  });

  await prisma.agentActionLog.create({
    data: {
      taskId: task1.id,
      agentId: "MASTER",
      eventType: "AGENT_REASONING",
      rawEvent: JSON.stringify({
        delegation: "EDITORIAL",
        reason: "Story pitch about campus news event",
      }),
      actionDescription:
        'Master Agent classified "USPF Foundation Day schedule" as editorial content and delegated to Editorial Agent.',
      autoExecuted: true,
    },
  });

  console.log("  Created 3 agent action log entries");
  console.log("Seed complete for The Southern Scholar!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
