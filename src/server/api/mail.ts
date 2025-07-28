import type { Session } from "next-auth";
import { TRPCError } from "@trpc/server";
import { gmail_v1, google } from "googleapis";
import { simpleParser } from "mailparser";

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

// decodes a base64url encoded string
function decodeBase64Url(data: string): string {
  // 1) URL‑safe -> standard Base64
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  // 2) Pad length to multiple of 4
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(pad);
  // 3) Decode
  return Buffer.from(padded, "base64").toString("utf-8");
}

export async function getMessageDetails(
  client: gmail_v1.Gmail,
  messageId: string
) {
  // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages#Message
  // when specifying raw format, we obtain RFC2822 + base64url encoded string
  const res = await client.users.messages.get({
    userId: "me", // or the user’s email address
    id: messageId,
    format: "raw", // 'full', 'metadata', 'minimal', 'raw'
  });

  const rawEmailData = decodeBase64Url(res.data.raw!);
  const parsed = await simpleParser(rawEmailData);

  return {
    text: parsed.text ?? "",
    subject: parsed.subject,
    from: Array.isArray(parsed.from) ? parsed.from[0]?.text : parsed.from?.text,
    to: Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text,
    date: parsed.date,
    attachments:
      parsed.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
      })) || [],
  };
}
