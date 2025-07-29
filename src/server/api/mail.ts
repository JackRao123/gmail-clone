import type { EmailMetaData } from "./routers/mail";
import type { Session } from "next-auth";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { gmail_v1, google } from "googleapis";
import { simpleParser } from "mailparser";

import { db } from "../db";

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

/**
 * @returns s3 client
 */
export function getS3Client() {
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return s3;
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

/**
 *
 * @param client - gmail client. call getGmailClient(ctx.session) to obtain this
 * @param messageId - ID of message (in gmail API) to fetch details for
 * @returns details of the message
 */
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

  const from = parsed.from?.text ?? "";
  let to = ""; // it can be AddressObject | AddressObject[] | undefined
  if (parsed.to && typeof parsed.to === "object" && !Array.isArray(parsed.to)) {
    const toObj = parsed.to;
    if (
      Array.isArray(toObj.value) &&
      toObj.value.length > 0 &&
      toObj.value[0] &&
      typeof toObj.value[0].address === "string"
    ) {
      to = toObj.value[0].address;
    } else if (typeof toObj.text === "string") {
      to = toObj.text;
    }
  }

  // https://developers.google.com/workspace/gmail/api/guides/labels
  // labels are string literals like INBOX, SENT, ...
  const labels = res.data.labelIds ?? [];
  console.log(`Label ids  = ${JSON.stringify(labels, null, 2)}`);

  return {
    // text: parsed.text ?? "",
    html: parsed.html ?? "",
    subject: parsed.subject ?? "",
    from,
    to,
    date: parsed.date,
    labels: labels,
    // attachments: parsed.attachments,
  };
}

export async function listEmails(
  userId: string,
  limit: number,
  offset: number,
  labelFilter: string
) {
  const found = await db.email.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      date: "desc",
    },
    take: limit,
    skip: offset,
    select: {
      messageId: true,
      subject: true,
      from: true,
      to: true,
      date: true,
      createdAt: true,
      labels: true,
    },
  });

  // filter for emails that have a label matching the labelFilter
  const emails: EmailMetaData[] = found
    .filter((email) => email.labels.includes(labelFilter))
    .map((email) => ({
      createdAt: email.createdAt,
      messageId: email.messageId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      date: email.date,
    }));

  return {
    emails,
    total: emails.length,
  };
}
