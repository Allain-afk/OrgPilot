import { NextResponse } from "next/server";

export async function GET() {
  const mockEnabled = process.env.MOCK_EMAIL_ENABLED === "true";

  return NextResponse.json({
    mockEmail: {
      enabled: mockEnabled,
      receiver: mockEnabled ? process.env.MOCK_EMAIL_RECEIVER ?? "" : null,
      receiverName: mockEnabled
        ? process.env.MOCK_EMAIL_RECEIVER_NAME ?? ""
        : null,
    },
  });
}
