import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import {
  getGmailClient,
  getMessageDetails,
  getS3Client,
  listEmails,
  listThreads,
  syncThreads,
} from "../mail";

export interface EmailMetaData {
  createdAt: Date;
  messageId: string;
  subject: string | null;
  from: string | null;
  to: string | null;
  date: Date | null;
}

export const mailRouter = createTRPCRouter({
  // Fetch threads from database
  list_threads: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await listThreads(
        ctx.session.user.id,
        input.limit,
        input.offset,
        "INBOX"
      );
    }),

  // Sync threads from Gmail API
  sync_threads: protectedProcedure
    .input(
      z.object({
        maxResults: z.number().min(1).max(100).default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gmailClient = getGmailClient(ctx.session);

      try {
        return await syncThreads(
          gmailClient,
          ctx.session.user.id,
          input.maxResults
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sync threads: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get emails in a thread
  get_thread_emails: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const s3Client = getS3Client();

      const emails = await ctx.db.email.findMany({
        where: {
          threadId: input.threadId,
          userId: ctx.session.user.id,
        },
        orderBy: {
          date: "asc", // Show emails in chronological order
        },
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

      const emailData: {
        html: string;
        createdAt: Date;
        messageId: string;
        subject: string | null;
        from: string | null;
        to: string | null;
        date: Date | null;
        labels: string[];
      }[] = [];

      for (const email of emails) {
        // Fetch raw HTML from S3
        const { Body } = await s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: email.messageId,
          })
        );
        const chunks: Buffer[] = [];
        for await (const chunk of Body as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        const html = Buffer.concat(chunks).toString("utf-8");

        emailData.push({
          ...email,
          html,
        });
      }

      return emailData;
    }),

  // Delete all our messages, just for debugging purposes
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const deleted = await ctx.db.thread.deleteMany({
      where: { userId: ctx.session.user.id },
    });

    return {
      count: deleted.count,
    };
  }),
});
