// Purpose of this is when i submit a curl request to this, it just calls a function of my choice

import { NextResponse } from "next/server";

import { getGoogleOAuthTokens } from "~/server/api/mail";
import { setupPushInboxUpdates } from "~/server/api/pubsub";

export async function POST(req: Request) {
  try {
    const userId = "cmdsdsxuw0000o2mxo7nptutv";
    const gmailTokens = await getGoogleOAuthTokens(userId);
    await setupPushInboxUpdates(
      userId,
      gmailTokens.accessToken,
      gmailTokens.refreshToken
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ message: "Success" }, { status: 200 });
}
