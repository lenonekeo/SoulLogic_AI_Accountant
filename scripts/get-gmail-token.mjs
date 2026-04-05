/**
 * Run: node scripts/get-gmail-token.mjs
 * Generates a Gmail refresh token and saves it to .env.local automatically.
 */

import { createServer } from "http";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env.local");

const CLIENT_ID = "REDACTED_GOOGLE_CLIENT_ID";
const CLIENT_SECRET = "REDACTED_GOOGLE_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:4321/callback";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n✅ Open this URL in your browser:\n");
console.log(authUrl);
console.log("\nWaiting for Google to redirect back...\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:4321");
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No code found.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (refreshToken) {
      // Save to .env.local
      let env = readFileSync(ENV_PATH, "utf-8");
      if (env.includes("GMAIL_REFRESH_TOKEN=")) {
        env = env.replace(/GMAIL_REFRESH_TOKEN=.*/, `GMAIL_REFRESH_TOKEN=${refreshToken}`);
      } else {
        env += `\nGMAIL_REFRESH_TOKEN=${refreshToken}\n`;
      }
      writeFileSync(ENV_PATH, env, "utf-8");

      res.end("<h2>✅ Success! Refresh token saved to .env.local. You can close this tab.</h2>");
      console.log("\n✅ GMAIL_REFRESH_TOKEN saved to .env.local");
      console.log("\nNext step: add this to Vercel → Settings → Environment Variables:");
      console.log("  GMAIL_REFRESH_TOKEN=" + refreshToken);
    } else {
      res.end("<h2>⚠️ No refresh token returned. See terminal.</h2>");
      console.log("⚠️  No refresh token returned. Revoke app access at myaccount.google.com/permissions and try again.");
    }

    server.close();
  } catch (err) {
    res.end("Error exchanging code.");
    console.error("Error:", err);
    server.close();
  }
});

server.listen(4321);
