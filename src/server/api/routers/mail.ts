import type { Session } from "next-auth";
import { TRPCError } from "@trpc/server";
import { google } from "googleapis";
import z from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { getGmailClient, getMessageDetails } from "../mail";

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
      const emails = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        orderBy: {
          date: "desc",
        },
        take: input.limit,
        skip: input.offset,
        select: {
          id: true,
          messageId: true,
          subject: true,
          from: true,
          to: true,
          date: true,
          createdAt: true,
        },
      });

      return {
        emails: emails.map((email) => ({
          id: email.messageId,
          subject: email.subject,
          from: email.from,
          to: email.to,
          date: email.date,
        })),
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

      return {
        text: email.text ?? "",
        subject: email.subject ?? "",
        from: email.from ?? "",
        to: email.to ?? "",
        date: email.date,
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
      const client = getGmailClient(ctx.session);

      try {
        // Get list of messages from Gmail
        const res = await client.users.messages.list({
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
            // Message already exists, skip
            continue;
          }

          // Get full message details from Gmail
          const messageDetails = await getMessageDetails(client, msg.id);

          // Save to database (stub implementation)
          await ctx.db.email.create({
            data: {
              messageId: msg.id,
              subject: messageDetails.subject,
              from: messageDetails.from,
              to: messageDetails.to,
              text: messageDetails.text,
              date: messageDetails.date,
              userId: ctx.session.user.id,
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
