import { TRPCError } from "@trpc/server";
import { google } from "googleapis";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const mailRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const accessToken = ctx.session?.user.accessToken;
    const refreshToken = ctx.session?.user.refreshToken;

    // console.log(`accessToken = ${accessToken}`);
    // console.log(`refreshToken = ${refreshToken}`);

    const messageIds = Array<string>();

    try {
      const oAuth2Client = new google.auth.OAuth2({
        clientId: clientId,
        clientSecret: clientSecret,
      });

      oAuth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      const res = await gmail.users.messages.list({
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
