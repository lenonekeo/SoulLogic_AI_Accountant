import { PROCESSED_LABEL } from "./gmail";

/**
 * The Gmail search used to find candidate invoices.
 *
 * Deliberately broad: any mail carrying a readable attachment that this
 * pipeline has not examined yet. It does not filter on the subject, because
 * vendors label invoices "relevé", "avis de retard", "statement" and a dozen
 * other things — a keyword list loses real payables to save a fraction of a
 * cent, and the AI pre-check already rejects whatever is not an invoice.
 *
 * Candidates are tracked with a label rather than the read flag, so a sweep
 * never marks unrelated mail as read.
 */
const SUPPORTED_FILENAMES = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif"];

/**
 * How far back to look. Without a bound the search matches the whole mailbox —
 * over 3000 messages here — which would spend a pre-check on every attachment
 * ever received and file years-old invoices into the current books.
 */
const DEFAULT_WINDOW = "90d";

export function invoiceSearchQuery(options?: { window?: string }): string {
  const filenames = SUPPORTED_FILENAMES.map((ext) => `filename:${ext}`).join(" OR ");
  const window = options?.window ?? process.env.EMAIL_CHECK_WINDOW ?? DEFAULT_WINDOW;
  const recency = window === "all" ? "" : ` newer_than:${window}`;
  // is:unread is a floor, not the progress record. Earlier sweeps tracked
  // themselves by clearing UNREAD, so dropping it would re-offer every invoice
  // already filed and duplicate it. Anything this pipeline examines from now on
  // is excluded by the label instead, which leaves the read state alone.
  return `is:unread has:attachment (${filenames}) -label:"${PROCESSED_LABEL}" -in:trash -in:spam${recency}`;
}
