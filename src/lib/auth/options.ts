import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getAccountByEmail } from "@/lib/google/accounts";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/drive.file",
          ].join(" "),
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      (session as { refreshToken?: string }).refreshToken = token.refreshToken as string | undefined;
      (session as { accountNo?: string }).accountNo = token.accountNo as string | undefined;
      (session as { spreadsheetId?: string }).spreadsheetId = token.spreadsheetId as string | undefined;
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      // Resolve which tenant spreadsheet this user owns. This must not fail
      // open: without it every request would fall back to a shared
      // spreadsheet and write one customer's books into another's.
      if (profile?.email && !token.accountNo) {
        const acct = await getAccountByEmail(profile.email);
        if (!acct) {
          throw new Error(`No account provisioned for ${profile.email}`);
        }
        if (!acct.Spreadsheet_ID) {
          throw new Error(`Account ${acct.Account_No} has no Spreadsheet_ID`);
        }
        token.accountNo = acct.Account_No;
        token.spreadsheetId = acct.Spreadsheet_ID;
      }
      return token;
    },
  },
};
