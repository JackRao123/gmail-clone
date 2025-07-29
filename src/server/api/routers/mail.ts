import type { Session } from "next-auth";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { google } from "googleapis";
import z from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { getGmailClient, getMessageDetails, getS3Client } from "../mail";

export interface EmailMetaData {
  createdAt: Date;
  messageId: string;
  subject: string | null;
  from: string | null;
  to: string | null;
  date: Date | null;
}

export const mailRouter = createTRPCRouter({
  // Fetch emails from database
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        useDatabase: z.boolean().default(true), // Whether to fetch from DB or Gmail API
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch from database
      const found = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        orderBy: {
          date: "desc",
        },
        take: input.limit,
        skip: input.offset,
        select: {
          messageId: true,
          subject: true,
          from: true,
          to: true,
          date: true,
          createdAt: true,
        },
      });

      const emails: EmailMetaData[] = found.map((email) => ({
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
    }),

  // Fetch email details from database
  get: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const messageId = input.messageId;
      const userId = ctx.session.user.id;
      const email = await ctx.db.email.findUnique({
        where: {
          messageId: messageId,
          userId: userId,
        },
      });

      if (!email) {
        throw new TRPCError({
          message: `Could not find email with message ID ${messageId} belonging to user ${userId}`,
          code: "NOT_FOUND",
        });
      }

      // Fetch raw HTML from S3
      const s3Client = getS3Client();
      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: messageId,
        })
      );
      const chunks: Buffer[] = [];
      for await (const chunk of Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      const html = Buffer.concat(chunks).toString("utf-8");

      return {
        subject: email.subject ?? "",
        from: email.from ?? "",
        to: email.to ?? "",
        date: email.date,
        html: html,
      };
    }),

  // Sync messages from google API into our DB
  sync: protectedProcedure
    .input(
      z.object({
        maxResults: z.number().min(1).max(100).default(20),
        query: z.string().optional(), // Gmail search query
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gmailClient = getGmailClient(ctx.session);
      const s3Client = getS3Client();

      try {
        // Get list of messages from Gmail
        const res = await gmailClient.users.messages.list({
          userId: "me",
          maxResults: input.maxResults,
          q: input.query, // Optional search query
        });

        if (!res.data.messages) {
          return {
            synced: 0,
            total: 0,
            message: "No new messages to sync",
          };
        }

        let syncedCount = 0;
        const totalMessages = res.data.messages.length;

        // Process each message
        for (const msg of res.data.messages) {
          if (!msg.id) continue;

          // Check if message already exists in database
          const existingEmail = await ctx.db.email.findUnique({
            where: {
              messageId: msg.id,
            },
          });

          if (existingEmail) {
            // gmail API users.messages.list fetches the messages in reverse-chronological order (newest first)
            // so if we reach an email we already have, we can just stop.
            break;
          }

          // Get full message details from Gmail
          const messageDetails = await getMessageDetails(gmailClient, msg.id);

          // store HTML in S3. key = messageId
          const html = messageDetails.html ? messageDetails.html : ""; // gmailapi says it can be string|false
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: msg.id,
              Body: html,
            })
          );

          // store metadata in our database
          await ctx.db.email.create({
            data: {
              userId: ctx.session.user.id,
              messageId: msg.id,
              subject: messageDetails.subject,
              from: messageDetails.from,
              to: messageDetails.to,
              date: messageDetails.date,
            },
          });

          syncedCount++;
        }

        return {
          synced: syncedCount,
          total: totalMessages,
          message: `Successfully synced ${syncedCount} new messages out of ${totalMessages} total messages`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sync messages: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Delete all our messages, just for debugging purposes
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const deleted = await ctx.db.email.deleteMany({
      where: { userId: ctx.session.user.id },
    });

    return {
      count: deleted.count,
    };
  }),
});
