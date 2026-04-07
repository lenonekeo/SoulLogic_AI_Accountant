import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getAccountByEmail } from "@/lib/google/accounts";

const handler = NextAuth({
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
      // Look up account info on first sign-in
      if (profile?.email && !token.accountNo) {
        try {
          const acct = await getAccountByEmail(profile.email);
          if (acct) {
            token.accountNo = acct.Account_No;
            token.spreadsheetId = acct.Spreadsheet_ID;
          }
        } catch {
          // Master sheet not configured yet — fall back gracefully
        }
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };
