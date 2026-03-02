import { prisma } from "@/lib/db/prisma";

// ─── Notification service ──────────────────────────────────────
// Supports mock email redirect for development/testing

export interface NotificationInput {
  userId: string;
  subject: string;
  body: string;
  channel: "EMAIL" | "LOG_ONLY";
}

export interface NotificationResult {
  sent: boolean;
  mockMode: boolean;
  recipientEmail: string;
  recipientName: string;
  originalRecipient?: string;
  subject: string;
}

function isMockEmailEnabled(): boolean {
  return process.env.MOCK_EMAIL_ENABLED === "true";
}

function getMockReceiver() {
  return {
    email: process.env.MOCK_EMAIL_RECEIVER ?? "",
    name: process.env.MOCK_EMAIL_RECEIVER_NAME ?? "Mock Receiver",
  };
}

async function resolveUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function sendNotification(
  input: NotificationInput
): Promise<NotificationResult> {
  const user = await resolveUser(input.userId);
  const originalName = user?.name ?? "Unknown";
  const originalEmail = user?.email ?? input.userId;
  const originalRole = user?.role ?? "Unknown";

  const mockMode = isMockEmailEnabled();

  if (mockMode) {
    const mock = getMockReceiver();
    const mockSubject = `[MOCK – Original recipient: ${originalName} (${originalRole})] ${input.subject}`;

    console.log(
      `[OrgPilot Mock] Email redirected to ${mock.name} (${mock.email})\n` +
        `  Original recipient: ${originalName} (${originalEmail}, ${originalRole})\n` +
        `  Subject: ${input.subject}`
    );

    if (input.channel === "EMAIL") {
      // TODO: Plug in real email transport (Nodemailer, Resend, etc.)
      // For now, the redirect target is logged; the transport would send to mock.email
      console.log(
        `[NOTIFICATION] Mock email to: ${mock.email} | Subject: ${mockSubject} | Body: ${input.body}`
      );
    } else {
      console.log(
        `[NOTIFICATION] LOG_ONLY (mock mode) | Original: ${originalEmail} | Subject: ${input.subject} | Body: ${input.body}`
      );
    }

    return {
      sent: true,
      mockMode: true,
      recipientEmail: mock.email,
      recipientName: mock.name,
      originalRecipient: `${originalName} (${originalEmail}, ${originalRole})`,
      subject: mockSubject,
    };
  }

  // Production mode — send to real recipient
  if (input.channel === "EMAIL") {
    // TODO: Plug in real email transport (Nodemailer, Resend, etc.)
    console.log(`[NOTIFICATION] Email sending not configured — logged instead.`);
  }

  console.log(
    `[NOTIFICATION] To: ${originalEmail} (${originalName}) | Subject: ${input.subject} | Body: ${input.body}`
  );

  return {
    sent: true,
    mockMode: false,
    recipientEmail: originalEmail,
    recipientName: originalName,
    subject: input.subject,
  };
}
