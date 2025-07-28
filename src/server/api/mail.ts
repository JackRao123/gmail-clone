import type { Session } from "next-auth";
import { TRPCError } from "@trpc/server";
import { gmail_v1, google } from "googleapis";

/**
 *
 * @param session - next auth session e.g. (pass ctx.session if calling from router)
 * @returns authenticated oAuth2Client
 */
export function getGmailClient(session: Session) {
  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Session doesn't exist",
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const accessToken = session?.user.accessToken;
  const refreshToken = session?.user.refreshToken;

  if (!accessToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "accessToken doesn't exist",
    });
  }

  if (!refreshToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "refreshToken doesn't exist",
    });
  }

  const oAuth2Client = new google.auth.OAuth2({
    clientId: clientId,
    clientSecret: clientSecret,
  });

  oAuth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: "v1", auth: oAuth2Client });
}

export async function getMessageDetails(
  client: gmail_v1.Gmail,
  messageId: string
) {
  const res = await client.users.messages.get({
    userId: "me", // or the user’s email address
    id: messageId,
    format: "full", // or 'metadata', 'minimal', 'raw'
  });
  return res.data; // this is your Gmail message object
}
