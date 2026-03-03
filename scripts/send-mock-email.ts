import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import {
  sendNotification,
  type NotificationResult,
} from "../lib/services/notifications";

async function main() {
  console.log(`MOCK_EMAIL_ENABLED = ${process.env.MOCK_EMAIL_ENABLED}`);
  console.log(`MOCK_EMAIL_RECEIVER = ${process.env.MOCK_EMAIL_RECEIVER}`);
  console.log(`MOCK_EMAIL_RECEIVER_NAME = ${process.env.MOCK_EMAIL_RECEIVER_NAME}`);
  console.log();

  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.error("No users in the database. Run the seed first.");
    process.exit(1);
  }

  const targetUser = users[0];
  console.log(`Target user: ${targetUser.name} (${targetUser.email}, ${targetUser.role})`);
  console.log();

  const result: NotificationResult = await sendNotification({
    userId: targetUser.id,
    subject: "OrgPilot Test: Mock Email Notification",
    body: [
      `Hi ${targetUser.name},`,
      "",
      "This is a test mock email from OrgPilot, the AI co-pilot for The Southern Scholar.",
      "If you received this, the mock email redirect system is working correctly.",
      "",
      "All notifications during development are redirected to the configured mock receiver.",
      "",
      "-- OrgPilot (The Southern Scholar AI Co-pilot)",
    ].join("\n"),
    channel: "EMAIL",
  });

  console.log("\n=== Mock Email Result ===");
  console.log(JSON.stringify(result, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
