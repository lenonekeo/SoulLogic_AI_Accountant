import { gmail_v1 } from "googleapis";
import { getEmailHeader } from "./gmail";
import { getAccountByEmail, Account } from "./accounts";

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

/**
 * Work out whose book an email belongs to.
 *
 * Recipient first, sender last: an invoice is addressed *to* the customer and
 * sent *by* the vendor, so keying on the sender only ever matched mail someone
 * sent to themselves — every genuine third-party invoice was discarded for
 * having no account.
 */
export async function resolveTenantAccount(
  message: gmail_v1.Schema$Message
): Promise<{ account: Account; matchedOn: string } | null> {
  const candidates: Array<{ address: string; header: string }> = [];
  for (const header of ["Delivered-To", "To", "Cc", "From"]) {
    for (const address of addressesIn(getEmailHeader(message, header))) {
      if (!candidates.some((c) => c.address === address)) {
        candidates.push({ address, header });
      }
    }
  }

  for (const { address, header } of candidates) {
    const account = await getAccountByEmail(address);
    if (account?.Spreadsheet_ID) return { account, matchedOn: `${header}: ${address}` };
  }
  return null;
}
