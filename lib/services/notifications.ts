import { prisma } from "@/lib/db/prisma";

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

function isBrevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.length > 0;
}

async function resolveUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
}

// ─── Brevo transactional email ──────────────────────────────────

interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendViaBrevo(
  to: { email: string; name: string },
  subject: string,
  textContent: string
): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY!;
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ?? "orgpilot@southernscholar.edu.ph";
  const senderName =
    process.env.BREVO_SENDER_NAME ?? "OrgPilot - The Southern Scholar";

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to.email, name: to.name }],
        subject,
        textContent,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(
        `[Brevo] API error ${res.status}: ${errorBody}`
      );
      return { success: false, error: `Brevo API ${res.status}: ${errorBody}` };
    }

    const data = (await res.json()) as { messageId?: string };
    console.log(`[Brevo] Email sent to ${to.email} — messageId: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Brevo] Send failed: ${message}`);
    return { success: false, error: message };
  }
}

// ─── Main notification entry point ─────────────────────────────

export async function sendNotification(
  input: NotificationInput
): Promise<NotificationResult> {
  const user = await resolveUser(input.userId);
  const originalName = user?.name ?? "Unknown";
  const originalEmail = user?.email ?? input.userId;
  const originalRole = user?.role ?? "Unknown";

  const mockMode = isMockEmailEnabled();

  // ── Mock mode: redirect all emails to the mock receiver ─────
  if (mockMode) {
    const mock = getMockReceiver();
    const mockSubject = `[MOCK - Original: ${originalName} (${originalRole})] ${input.subject}`;

    console.log(
      `[OrgPilot Mock] Email redirected to ${mock.name} (${mock.email})\n` +
        `  Original recipient: ${originalName} (${originalEmail}, ${originalRole})\n` +
        `  Subject: ${input.subject}`
    );

    if (input.channel === "EMAIL" && isBrevoConfigured()) {
      const brevoResult = await sendViaBrevo(
        { email: mock.email, name: mock.name },
        mockSubject,
        input.body
      );

      if (!brevoResult.success) {
        console.warn(
          `[OrgPilot Mock] Brevo send failed, falling back to log: ${brevoResult.error}`
        );
      }
    } else if (input.channel === "EMAIL") {
      console.log(
        `[NOTIFICATION] Mock email (Brevo not configured — logged only) to: ${mock.email} | Subject: ${mockSubject}`
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

  // ── Production mode: send to actual recipient ───────────────
  if (input.channel === "EMAIL" && isBrevoConfigured()) {
    const brevoResult = await sendViaBrevo(
      { email: originalEmail, name: originalName },
      input.subject,
      input.body
    );

    if (!brevoResult.success) {
      console.warn(
        `[NOTIFICATION] Brevo send failed: ${brevoResult.error}. Email logged instead.`
      );
    }
  } else if (input.channel === "EMAIL") {
    console.log(
      `[NOTIFICATION] No email transport configured (set BREVO_API_KEY) — logged instead.`
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
