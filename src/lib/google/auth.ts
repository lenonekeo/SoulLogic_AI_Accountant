import { google } from "googleapis";
import { JWT, OAuth2Client } from "google-auth-library";

let _auth: JWT | null = null;

export function getGoogleAuth(): JWT {
  if (_auth) return _auth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Missing Google Service Account credentials in environment variables");
  }

  _auth = new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return _auth;
}

// ── OAuth2 client for Gmail (uses user refresh token) ──
let _gmailAuth: OAuth2Client | null = null;

export function getGmailAuth(): OAuth2Client {
  if (_gmailAuth) return _gmailAuth;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Gmail OAuth credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are set."
    );
  }

  _gmailAuth = new google.auth.OAuth2(clientId, clientSecret);
  _gmailAuth.setCredentials({
    refresh_token: refreshToken,
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/drive.file",
    ].join(" "),
  });

  return _gmailAuth;
}
