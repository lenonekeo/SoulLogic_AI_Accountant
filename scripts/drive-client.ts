import { google, drive_v3 } from "googleapis";
import { getGmailAuth, getGoogleAuth } from "../src/lib/google/auth";

/**
 * Drive client for scripts, using the same credential choice as the app: files
 * are created under the user's OAuth, so only that identity can modify them.
 */
export function getDriveClientForScripts(): drive_v3.Drive {
  const auth = process.env.GMAIL_REFRESH_TOKEN ? getGmailAuth() : getGoogleAuth();
  return google.drive({ version: "v3", auth });
}
