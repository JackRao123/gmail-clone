import type { EmailMetaData } from "./routers/mail";
import type { gmail_v1 } from "googleapis";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { google } from "googleapis";
import { simpleParser } from "mailparser";

import { db } from "../db";

// Creates instance of authorised OAUTH2 client with specified tokens
export function getGmailClient(accessToken: string, refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

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

// retrieves the accessToken and refreshToken for a user
export async function getGoogleOAuthTokens(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { accounts: true },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const googleAccount = user.accounts.find((a) => a.provider === "google");

  if (!googleAccount) {
    throw new Error("No Google account");
  }

  return {
    accessToken: String(googleAccount.access_token),
    refreshToken: String(googleAccount.refresh_token),
  };
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

export interface ThreadMetaData {
  threadId: string;
  subject: string | null;
  snippet: string | null;
  from: string | null;
  to: string | null;
  date: Date | null;
  emailCount: number;
  unreadCount: number;
  labels: string[];
}

/**
 * Get thread details from Gmail API
 * @param client - gmail client
 * @param threadId - ID of thread to fetch
 * @returns thread details with messages
 */
export async function getThreadDetails(
  client: gmail_v1.Gmail,
  threadId: string
) {
  const res = await client.users.threads.get({
    userId: "me",
    id: threadId,
  });

  const thread = res.data;
  const messages = thread.messages ?? [];

  const threadLabels = new Set<string>(
    messages.flatMap((m) => m.labelIds ?? [])
  );
  // thread labels is union of message labels

  const latestTs = messages.reduce((maxTs, msg) => {
    // parse the internalDate (string of epoch ms) into a number
    const ts = msg.internalDate ? Number(msg.internalDate) : 0;
    return ts > maxTs ? ts : maxTs;
  }, 0);

  return {
    threadId: thread.id!,
    snippet: thread.snippet ?? "",
    messages: messages.map((msg) => ({
      messageId: msg.id!,
      threadId: thread.id!,
      labels: msg.labelIds ?? [],
      snippet: msg.snippet ?? "",
    })),
    historyId: thread.historyId,
    labels: Array.from(threadLabels),
    lastUpdate: latestTs,
  };
}

/**
 * List threads from database with email metadata
 * @param userId - user ID
 * @param limit - number of threads to fetch
 * @param offset - offset for pagination
 * @param labelFilter - label to filter by
 * @param search - search term to filter by (searches subject and from fields)
 * @returns threads with metadata
 */
export async function listThreads(
  userId: string,
  limit: number,
  offset: number,
  labelFilter: string,
  search = "" // "" matches everything
) {
  const threads = await db.thread.findMany({
    where: {
      userId: userId,
      labels: {
        has: labelFilter,
      },
      ...(search && {
        emails: {
          some: {
            OR: [
              {
                subject: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                from: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      }),
    },
    include: {
      emails: {
        orderBy: {
          date: "asc",
        },
        take: 1, // Get the most recent email for preview
      },
    },
    orderBy: {
      // Order by lastUpdate (when the last message was sent/received)
      // Most recent threads first
      lastUpdate: "desc",
    },
    take: limit,
    skip: offset,
  });

  const threadData: ThreadMetaData[] = threads.map((thread) => {
    const latestEmail = thread.emails[0];
    const unreadCount = thread.emails.filter((email) =>
      email.labels.includes("UNREAD")
    ).length;

    let snippet = "";
    if (thread.snippet && thread.snippet != "") {
      snippet = thread.snippet;
    } else if (latestEmail?.snippet && latestEmail.snippet != "") {
      snippet = latestEmail.snippet;
    }

    return {
      threadId: thread.threadId,
      subject: latestEmail?.subject ?? "No subject",
      snippet: snippet,
      from: latestEmail?.from ?? "",
      to: latestEmail?.to ?? "",
      date: latestEmail?.date ?? null,
      emailCount: thread.emails.length,
      unreadCount,
      labels: thread.labels,
    };
  });

  return {
    threads: threadData,
    total: threadData.length,
  };
}

/**
 * Sync threads from Gmail API to database
 * @param client - gmail client
 * @param userId - user ID
 * @param maxResults - maximum threads to sync
 * @param pageToken - optional pageToken to sync from
 * @returns sync result
 */
export async function syncThreads(
  client: gmail_v1.Gmail,
  userId: string,
  maxResults = 20,
  pageToken?: string
) {
  const s3Client = getS3Client();
  const res = await client.users.threads.list({
    userId: "me",
    maxResults,
    pageToken: pageToken,
  });

  const gmailThreads = res.data.threads ?? [];
  let syncedCount = 0;
  const totalThreads = gmailThreads.length;
  for (const gmailThread of gmailThreads) {
    if (!gmailThread.id) continue;

    //have to disable this optimisation because threads can get updated
    // todo - figure out how to efficiently sync

    // Check if thread already exists
    const existingThread = await db.thread.findUnique({
      where: {
        threadId: gmailThread.id,
        userId: userId,
      },
    });

    if (existingThread && existingThread.historyId === gmailThread.historyId) {
      // thread in DB exists AND it is up to date
      continue;
    }

    // Get full thread details
    const threadDetails = await getThreadDetails(client, gmailThread.id);

    // Create thread in database
    const thread = await db.thread.upsert({
      where: {
        threadId: threadDetails.threadId,
      },
      create: {
        threadId: threadDetails.threadId,
        userId: userId,
        snippet: threadDetails.snippet,
        historyId: threadDetails.historyId,
        labels: threadDetails.labels,
        lastUpdate: threadDetails.lastUpdate,
      },
      update: {
        snippet: threadDetails.snippet,
        historyId: threadDetails.historyId,
        labels: threadDetails.labels,
        lastUpdate: threadDetails.lastUpdate,
      },
    });

    // Process each message in the thread
    for (const messageInfo of threadDetails.messages) {
      // Check if message already exists
      const existingEmail = await db.email.findUnique({
        where: {
          messageId: messageInfo.messageId,
        },
      });

      // emails cannot be edited (unless they are drafts - which we dont have to consider)
      if (existingEmail) continue;

      // Get full message details
      const messageDetails = await getMessageDetails(
        client,
        messageInfo.messageId
      );

      // Store HTML in S3
      const html = messageDetails.html || "";
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: messageInfo.messageId,
          Body: html,
        })
      );

      // Store email in database
      await db.email.create({
        data: {
          userId: userId,
          messageId: messageInfo.messageId,
          threadId: thread.threadId,
          subject: messageDetails.subject,
          from: messageDetails.from,
          to: messageDetails.to,
          date: messageDetails.date,
          labels: messageDetails.labels,
          snippet: messageInfo.snippet,
        },
      });
    }

    syncedCount++;
  }

  return {
    synced: syncedCount,
    total: totalThreads,
    message: `Successfully synced ${syncedCount} new threads out of ${totalThreads} total threads`,
    nextPageToken: res.data.nextPageToken,
  };
}
