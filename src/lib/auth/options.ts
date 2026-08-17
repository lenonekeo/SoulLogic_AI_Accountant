import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";
import { Account, getAccountByEmail, updateAccount } from "@/lib/google/accounts";
import { provisionTenantBook } from "@/lib/tenant/provision";
import { today } from "@/lib/utils/date";

/**
 * Create this account's book in the customer's own Drive and record it.
 *
 * Runs at first sign-in rather than at checkout because it needs the
 * customer's credentials. Their access token is only present on the sign-in
 * that granted it, so a failure here leaves the account pending and the next
 * sign-in retries — better than a half-provisioned account.
 */
async function provisionForAccount(acct: Account, accessToken: string): Promise<string> {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!serviceAccountEmail) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not set");

  const userAuth = new google.auth.OAuth2();
  userAuth.setCredentials({ access_token: accessToken });

  const book = await provisionTenantBook(userAuth, {
    accountNo: acct.Account_No,
    serviceAccountEmail,
  });

  // Record it before returning: a book nobody can find is the same as no book.
  await updateAccount(acct.Account_No, {
    Spreadsheet_ID: book.spreadsheetId,
    Status: "active",
    Provisioned_Date: today(),
  });

  console.log(`[auth] Provisioned ${book.spreadsheetId} for ${acct.Account_No}`);
  return book.spreadsheetId;
}

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

        let spreadsheetId = acct.Spreadsheet_ID;

        // First sign-in for a paid-but-unprovisioned account: build the book
        // now. It has to happen here because it needs this user's own Google
        // credentials — the service account cannot own Drive files, so the book
        // could not be created back when they paid.
        if (!spreadsheetId) {
          if (!account?.access_token) {
            throw new Error(
              `Account ${acct.Account_No} needs provisioning but this sign-in carried no access token`
            );
          }
          spreadsheetId = await provisionForAccount(acct, account.access_token);
        }

        token.accountNo = acct.Account_No;
        token.spreadsheetId = spreadsheetId;
      }
      return token;
    },
  },
};
