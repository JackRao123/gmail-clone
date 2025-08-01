import type { GmailNotification } from "~/app/api/sync/pubsub/route";
import type { gmail_v1 } from "googleapis";

import { db } from "../db";
import { getGmailClient, getGoogleOAuthTokens } from "./mail";

// Process a single message in history
async function processNewMessage(
  gmailClient: gmail_v1.Gmail,
  userId: string,
  messageId: string
) {
  try {
    // Import the necessary functions from mail.ts
    const { getMessageDetails, getThreadDetails } = await import("./mail");
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getS3Client } = await import("./mail");

    // Check if email already exists first
    const existingEmail = await db.email.findUnique({
      where: {
        messageId: messageId,
      },
    });

    // emails cannot be edited (unless they are drafts - which we don't have to consider)
    if (existingEmail) {
      console.log(`Email ${messageId} already exists, skipping`);
      return;
    }

    // Get message details
    const messageDetails = await getMessageDetails(gmailClient, messageId);

    // Get the message metadata to find threadId
    const messageMetadata = await gmailClient.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
    });

    const threadId = messageMetadata.data.threadId!;
    if (!threadId) {
      throw new Error(`No threadId found for message ${messageId}`);
    }

    // Store HTML in S3
    const s3Client = getS3Client();
    const html = messageDetails.html || "";
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: messageId,
        Body: html,
      })
    );

    // Check if thread exists, if not create it
    let thread = await db.thread.findUnique({
      where: {
        threadId: threadId,
        userId: userId,
      },
    });

    if (!thread) {
      // Get thread details
      const threadDetails = await getThreadDetails(gmailClient, threadId);

      thread = await db.thread.create({
        data: {
          threadId: threadDetails.threadId,
          userId: userId,
          snippet: threadDetails.snippet,
          historyId: threadDetails.historyId,
          labels: threadDetails.labels,
          lastUpdate: threadDetails.lastUpdate,
        },
      });
    }

    // Store email in database
    await db.email.create({
      data: {
        userId: userId,
        messageId: messageId,
        threadId: thread.threadId,
        subject: messageDetails.subject,
        from: messageDetails.from,
        to: messageDetails.to,
        date: messageDetails.date,
        labels: messageDetails.labels,
        snippet: messageDetails.subject || "", // Use subject as snippet fallback
      },
    });

    console.log(`Processed new message ${messageId} for user ${userId}`);
  } catch (error) {
    console.error(`Error processing new message ${messageId}:`, error);
    throw error;
  }
}

// Handle Pub/Sub message for Gmail notifications
export async function handleGmailNotification(message: GmailNotification) {
  try {
    console.log("Received Gmail notification:", message);
    const user = await db.user.findUniqueOrThrow({
      where: {
        email: message.emailAddress,
      },
      select: {
        id: true,
        prevHistoryId: true,
      },
    });

    if (!user.prevHistoryId) {
      throw new Error("Prev history id is not set. Must be set on signUp()");
    }

    const historyId = message.historyId;
    const prevHistoryId = user.prevHistoryId;
    if (historyId <= prevHistoryId) {
      console.log(`skipping outdated message with historyId=${historyId}`);
    }

    const userId = user.id;
    const googleTokens = await getGoogleOAuthTokens(userId);
    const gmailClient = getGmailClient(
      googleTokens.accessToken,
      googleTokens.refreshToken
    );

    // NOTE - we don't have logic that handles cases where the history is >500 messages
    const historyResponse = await gmailClient.users.history.list({
      userId: "me",
      startHistoryId: prevHistoryId, // retrieves history since the last one.
      // message provides the new historyId so if we use message.historyId we will get 0 results.
      historyTypes: ["messageAdded"],
      maxResults: 500,
    });

    // console.log(
    //   `historyResponse = ${JSON.stringify(historyResponse, null, 2)}`
    // );
    // console.log(
    //   `historyResponse.data = ${JSON.stringify(historyResponse.data, null, 2)}`
    // );
    // console.log(
    //   `historyResponse.data.history = ${JSON.stringify(historyResponse.data.history, null, 2)}`
    // );

    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list#History
    const history = historyResponse.data.history;
    if (!history || history.length === 0) {
      console.log("No new changes found");
      return;
    }

    for (const historyEntry of history) {
      if (historyEntry.messagesAdded) {
        for (const messageAdded of historyEntry.messagesAdded) {
          if (messageAdded.message?.id) {
            await processNewMessage(
              gmailClient,
              userId,
              messageAdded.message.id
            );
          }
        }
      }
    }

    await db.user.update({
      where: {
        id: userId,
      },
      data: {
        prevHistoryId: String(historyId),
      },
    });

    console.log(
      `Processed ${history.length} history entries for user ${userId}`
    );
  } catch (error) {
    console.error("Error handling Gmail notification:", error);
    throw error;
  }
}
