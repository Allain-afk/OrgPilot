import { NextResponse } from "next/server";

// Stub endpoint for email webhook integration
// Will be connected to Gmail / SMTP webhooks in a future iteration
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log(
      "[Webhook/Email] Received payload:",
      JSON.stringify(body).slice(0, 500)
    );

    return NextResponse.json(
      {
        message:
          "Email webhook received — processing not yet implemented. Payload logged.",
        receivedAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[Webhook/Email] Error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
