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
  list: protectedProcedure.query(async ({ ctx, input }) => {
    const client = getGmailClient(ctx.session);

    // Retrieve list of Ids
    const messageIds = Array<string>();
    try {
      const res = await client.users.messages.list({
        userId: "me",
        maxResults: 20,
      });

      if (res.data.messages) {
        for (const msg of res.data.messages) {
          if (msg.id) {
            messageIds.push(msg.id);
          }
        }
      }
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: JSON.stringify(e),
      });
    }

    return {
      emails: messageIds,
    };
  }),

  get: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = getGmailClient(ctx.session);
      const data = await getMessageDetails(client, input.messageId);

      return data;
    }),

  //   create: protectedProcedure
  //     .input(z.object({ name: z.string().min(1) }))
  //     .mutation(async ({ ctx, input }) => {
  //       return ctx.db.post.create({
  //         data: {
  //           name: input.name,
  //           createdBy: { connect: { id: ctx.session.user.id } },
  //         },
  //       });
  //     }),
});
