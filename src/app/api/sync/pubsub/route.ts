import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleGmailNotification } from "../../../../server/api/gmail-push";

interface PubsubNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const data = JSON.parse(body) as PubsubNotification;

    // Verify this is a Pub/Sub push message
    if (!data.message?.data) {
      return NextResponse.json(
        { error: "Invalid Pub/Sub message format" },
        { status: 400 }
      );
    }

    // Decode the base64-encoded message data
    const messageData = Buffer.from(data.message.data, "base64").toString();
    const message = JSON.parse(messageData) as GmailNotification;

    // Handle the Gmail notification
    await handleGmailNotification(message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Pub/Sub webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
