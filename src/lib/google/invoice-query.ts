/**
 * The Gmail search used to find candidate invoices.
 *
 * Defined once so the cron, the manual sweep and the diagnostic all look at the
 * same mail. The filename clause matters: without it, recurring reports that
 * merely mention "invoice" in the subject and attach a spreadsheet match too,
 * and since a cron run only takes the first handful of messages those can fill
 * an entire sweep and starve the real invoices.
 */
const SUPPORTED_FILENAMES = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif"];

export function invoiceSearchQuery(monitorAddress: string): string {
  const filenames = SUPPORTED_FILENAMES.map((ext) => `filename:${ext}`).join(" OR ");
  const subjects = "subject:(invoice OR bill OR receipt OR facture)";
  const sender = monitorAddress ? ` OR from:${monitorAddress}` : "";
  return `is:unread has:attachment (${filenames}) (${subjects}${sender})`;
}
