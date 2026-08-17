import { NextRequest } from "next/server";
import Stripe from "stripe";
import {
  createAccount,
  getAccountByEmail,
  getAccountByStripeSession,
  nextAccountNo,
  generateAlias,
} from "@/lib/google/accounts";
import { sendEmail } from "@/lib/google/gmail";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function welcomeHtml(accountNo: string, alias: string | null, appUrl: string): string {
  const aliasBlock = alias
    ? `<p>Forward invoices to <strong>${alias}</strong> and they will be filed automatically.</p>`
    : "";
  return `<h2>Welcome — your account is ready to set up.</h2>
    <p>Account number: <strong>${accountNo}</strong></p>
    <p><a href="${appUrl}/login">Sign in with Google</a> to finish setting up.
    Your books are created in your own Google Drive the first time you sign in,
    so use the Google account you want them to live in.</p>
    ${aliasBlock}
    <p>Questions? Just reply to this email.</p>`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ok", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = (session.customer_email ?? session.metadata?.email ?? "").toLowerCase();
  const plan = session.metadata?.plan ?? "pro";
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : "";
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : "";

  if (!email) {
    // Nothing to key an account on, and retrying will not conjure one.
    console.error(`[stripe/webhook] session ${session.id} has no email; cannot provision`);
    return new Response("ok", { status: 200 });
  }

  try {
    // Stripe redelivers events, so creating unconditionally would hand one
    // customer two accounts. Both checks matter: the session id catches a
    // replay of this event, the email catches a second checkout by someone who
    // already has an account.
    const bySession = await getAccountByStripeSession(session.id);
    if (bySession) {
      console.log(`[stripe/webhook] session ${session.id} already provisioned as ${bySession.Account_No}`);
      return new Response("ok", { status: 200 });
    }
    const byEmail = await getAccountByEmail(email);
    if (byEmail) {
      console.log(`[stripe/webhook] ${email} already has ${byEmail.Account_No}; recording subscription only`);
      return new Response("ok", { status: 200 });
    }

    // The row is created "pending" with no spreadsheet. The book has to be made
    // with the customer's own Google credentials — the service account cannot
    // own Drive files — so it is created at first sign-in instead.
    const accountNo = await nextAccountNo();
    const alias = generateAlias();
    await createAccount(accountNo, email, "", stripeCustomerId, stripeSubscriptionId, plan, {
      status: "pending",
      alias: alias ?? "",
      stripeSessionId: session.id,
    });

    const appUrl = process.env.APP_URL ?? "https://soullogic-ai-accountant.vercel.app";
    await sendEmail(email, "Welcome to SoulLogic AI Accountant", welcomeHtml(accountNo, alias, appUrl));

    console.log(`[stripe/webhook] ${accountNo} created pending for ${email}`);
    return new Response("ok", { status: 200 });
  } catch (err) {
    // Fail loudly so Stripe retries. The handler is idempotent, so a retry is
    // safe — whereas swallowing this left a paying customer with no account and
    // nothing but a log line to show it.
    console.error("[stripe/webhook] Provisioning failed:", err);
    return new Response("Provisioning failed", { status: 500 });
  }
}
