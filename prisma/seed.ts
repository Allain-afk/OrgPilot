import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateUrl = process.env.DATABASE_URL;
if (!accelerateUrl) {
  console.error('DATABASE_URL must be set for Prisma Accelerate');
  process.exit(1);
}

const prisma = new PrismaClient({ accelerateUrl }).$extends(withAccelerate());

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Users (org officers) ───────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "maria.lopez@schoolorg.edu" },
      update: {},
      create: {
        name: "Maria Lopez",
        email: "maria.lopez@schoolorg.edu",
        role: "PRESIDENT",
      },
    }),
    prisma.user.upsert({
      where: { email: "james.chen@schoolorg.edu" },
      update: {},
      create: {
        name: "James Chen",
        email: "james.chen@schoolorg.edu",
        role: "VICE_PRESIDENT",
      },
    }),
    prisma.user.upsert({
      where: { email: "aisha.patel@schoolorg.edu" },
      update: {},
      create: {
        name: "Aisha Patel",
        email: "aisha.patel@schoolorg.edu",
        role: "SECRETARY",
      },
    }),
    prisma.user.upsert({
      where: { email: "david.kim@schoolorg.edu" },
      update: {},
      create: {
        name: "David Kim",
        email: "david.kim@schoolorg.edu",
        role: "TREASURER",
      },
    }),
    prisma.user.upsert({
      where: { email: "sofia.martinez@schoolorg.edu" },
      update: {},
      create: {
        name: "Sofia Martinez",
        email: "sofia.martinez@schoolorg.edu",
        role: "LOGISTICS",
      },
    }),
  ]);

  console.log(`  ✓ Created ${users.length} users`);

  // ─── Tasks ──────────────────────────────────────────────────
  const task1 = await prisma.task.create({
    data: {
      title: "Annual Science Fair Planning",
      description:
        "Need to book auditorium, arrange 5 judges, set up online registration form, and coordinate with the science department.",
      type: "EVENT_REQUEST",
      status: "NEW",
      priority: "HIGH",
      ownerId: users[0].id, // President
      dueDate: new Date("2026-04-15"),
      sourceSystem: "FORM",
      sourceId: "form-resp-001",
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Fix broken projector in Room 204",
      description:
        "The ceiling-mounted projector in Room 204 is showing a yellow tint and intermittent power failures. Reported by Mr. Thompson.",
      type: "FACILITY",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      ownerId: users[4].id, // Logistics
      sourceSystem: "EMAIL",
      sourceId: "email-msg-042",
    },
  });

  console.log(`  ✓ Created 2 sample tasks`);

  // ─── Agent action log ───────────────────────────────────────
  await prisma.agentActionLog.create({
    data: {
      taskId: task1.id,
      eventType: "INGEST_EVENT",
      rawEvent: JSON.stringify({
        formType: "EVENT_REQUEST",
        payload: {
          title: "Annual Science Fair",
          requestedBy: "Maria Lopez",
        },
      }),
      actionDescription:
        'Created task "Annual Science Fair Planning" from Google Form submission. Assigned to President (Maria Lopez) with HIGH priority and due date 2026-04-15.',
      autoExecuted: true,
    },
  });

  await prisma.agentActionLog.create({
    data: {
      taskId: task2.id,
      eventType: "TASK_UPDATE",
      rawEvent: JSON.stringify({
        source: "email",
        subject: "Projector Issue Room 204",
      }),
      actionDescription:
        'Updated facility task "Fix broken projector in Room 204" status to IN_PROGRESS. Assigned to Logistics (Sofia Martinez).',
      autoExecuted: true,
    },
  });

  console.log(`  ✓ Created 2 agent action log entries`);
  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
