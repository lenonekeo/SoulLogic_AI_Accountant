import { gmail_v1 } from "googleapis";
import { getEmailHeader } from "./gmail";
import { getAccountByAlias, getAccountByEmail, listAccounts, Account } from "./accounts";

/**
 * Headers that can carry the address a message was actually sent to.
 *
 * More than one, because forwarding rewrites them: a catch-all that forwards
 * into another mailbox sets Delivered-To to the final mailbox and keeps the
 * original alias in To or X-Forwarded-To.
 */
const RECIPIENT_HEADERS = [
  "Delivered-To",
  "X-Forwarded-To",
  "X-Original-To",
  "To",
  "Cc",
  "Envelope-To",
];

/** Every address appearing in a header, lowercased. */
function addressesIn(headerValue: string): string[] {
  if (!headerValue) return [];
  return headerValue
    .split(",")
    .map((part) => {
      const angled = part.match(/<([^>]+)>/);
      return (angled ? angled[1] : part).trim().toLowerCase();
    })
    .filter((a) => a.includes("@"));
}

export function recipientAddresses(message: gmail_v1.Schema$Message): string[] {
  const seen: string[] = [];
  for (const header of RECIPIENT_HEADERS) {
    for (const address of addressesIn(getEmailHeader(message, header))) {
      if (!seen.includes(address)) seen.push(address);
    }
  }
  return seen;
}

export type TenantMatch =
  | { account: Account; matchedOn: string }
  | { account: null; reason: "no-match" | "ambiguous" };

/**
 * Work out whose book an email belongs to.
 *
 * The per-account alias is checked first and wins outright: when several
 * customers forward into one mailbox, every message shares the same
 * Delivered-To, so matching on that alone would file all of them against
 * whoever owns the mailbox.
 *
 * Without an alias, attribution is only safe while a single account exists.
 * With more than one, the message is left unclaimed rather than guessed at —
 * mis-filing one customer's invoice into another's books is worse than
 * leaving it for a human.
 */
export async function resolveTenantAccount(
  message: gmail_v1.Schema$Message
): Promise<TenantMatch> {
  const recipients = recipientAddresses(message);

  for (const address of recipients) {
    const account = await getAccountByAlias(address);
    if (account?.Spreadsheet_ID) {
      return { account, matchedOn: `alias ${address}` };
    }
  }

  const accounts = await listAccounts(false);
  if (accounts.length > 1) {
    return { account: null, reason: "ambiguous" };
  }

  // Single-tenant: the owner's own address, or the sender for self-sent mail.
  for (const address of [...recipients, ...addressesIn(getEmailHeader(message, "From"))]) {
    const account = await getAccountByEmail(address);
    if (account?.Spreadsheet_ID) {
      return { account, matchedOn: `account email ${address}` };
    }
  }
  return { account: null, reason: "no-match" };
}
