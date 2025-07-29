import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import z from "zod";

import { db } from "~/server/db";

// Response from google api when trying to refresh token
const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    error?: string;
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
      accessToken: string;
      refreshToken: string;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    // DiscordProvider,
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      authorization: {
        params: {
          scope: [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          access_type: "offline", // so that we get refresh_token
          prompt: "consent",
        },
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    async session({ session, user }) {
      const [acct] = await db.account.findMany({
        where: { userId: user.id, provider: "google" },
      });

      if (!acct) {
        session.error = "NoGoogleAccount";
        return session;
      }

      // if the token has already expired we need to refresh it
      if (acct.expires_at && acct.expires_at * 1000 < Date.now()) {
        try {
          if (!acct.refresh_token) {
            throw new Error("Account does not have refresh token");
          }

          // try to refresh the token, using the refreshtoken (which should not be null)
          const resp = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: acct.refresh_token,
            }),
          });

          const body = RefreshTokenResponseSchema.parse(await resp.json());
          if (!resp.ok) {
            throw new Error(
              `Failed to request token refresh\nResponse: ${JSON.stringify(body, null, 2)}`
            );
          }
          await db.account.update({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: acct.providerAccountId,
              },
            },
            data: {
              access_token: body.access_token,
              expires_at: Math.floor(Date.now() / 1000 + body.expires_in),
              refresh_token: body.refresh_token ?? acct.refresh_token,
            },
          });

          // replace tokens.
          acct.access_token = body.access_token;
          acct.refresh_token = body.refresh_token ?? acct.refresh_token;
        } catch (err) {
          throw new Error(
            "Error refreshing Google token" + JSON.stringify(err)
          );
        }
      }

      session.user.accessToken = acct.access_token!;
      session.user.refreshToken = acct.refresh_token!;

      return session;
    },
  },
} satisfies NextAuthConfig;
