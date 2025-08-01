import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getGmailClient,
  getGoogleOAuthTokens,
  syncThreads,
} from "../../../../server/api/mail";
import { db } from "../../../../server/db";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Security: check secret
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get one PendingSync (any)
  const pending = await db.pendingSync.findFirst();
  if (!pending) {
    return NextResponse.json({ message: "No pending syncs" });
  }

  try {
    const googleTokens = await getGoogleOAuthTokens(pending.userId);
    const gmailClient = getGmailClient(
      googleTokens.accessToken,
      googleTokens.refreshToken
    );

    const userId = pending.userId;
    const syncRes = await syncThreads(
      gmailClient,
      userId,
      500,
      pending.nextPageToken ?? undefined
    );

    if (syncRes.nextPageToken) {
      await db.pendingSync.update({
        where: {
          userId: userId,
        },
        data: {
          nextPageToken: syncRes.nextPageToken,
        },
      });
    } else {
      // all message history synced
      await db.pendingSync.delete({
        where: {
          userId: userId,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error syncing threads" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}
