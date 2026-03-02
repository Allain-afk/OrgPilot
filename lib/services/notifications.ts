// ─── Notification service stub ──────────────────────────────────
// Abstraction layer for future Gmail / SMTP / push integration

export interface NotificationInput {
  userId: string;
  subject: string;
  body: string;
  channel: "EMAIL" | "LOG_ONLY";
}

export async function sendNotification(input: NotificationInput): Promise<void> {
  if (input.channel === "EMAIL") {
    // TODO: Plug in real email transport (Nodemailer, Resend, etc.)
    console.log(
      `[NOTIFICATION] Email sending not configured — logged instead.`
    );
  }

  console.log(
    `[NOTIFICATION] To: ${input.userId} | Subject: ${input.subject} | Body: ${input.body}`
  );
}
