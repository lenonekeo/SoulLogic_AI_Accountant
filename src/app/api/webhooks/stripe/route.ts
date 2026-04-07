import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createAccount } from "@/lib/google/accounts";
import { sendEmail } from "@/lib/google/gmail";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ── Generate Account_No: SL-YYYY-XXXXXX ──
function generateAccountNo(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return `SL-${year}-${rand}`;
}

// ── Copy template spreadsheet for new subscriber ──
async function provisionSpreadsheet(email: string, accountNo: string): Promise<string> {
  const { google } = await import("googleapis");
  const { getGoogleAuth } = await import("@/lib/google/auth");
  const drive = google.drive({ version: "v3", auth: getGoogleAuth() });

  const templateId = process.env.TEMPLATE_SPREADSHEET_ID!;

  // Copy the template
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: `SoulLogic_${accountNo}` },
  });
  const newSpreadsheetId = copy.data.id!;

  // Share with service account so it can write to it
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  await drive.permissions.create({
    fileId: newSpreadsheetId,
    requestBody: { role: "writer", type: "user", emailAddress: serviceEmail },
  });

  console.log(`[stripe/webhook] Provisioned spreadsheet ${newSpreadsheetId} for ${email}`);
  return newSpreadsheetId;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email ?? (session.metadata?.email ?? "");
    const plan = session.metadata?.plan ?? "pro";
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : "";
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : "";

    try {
      const accountNo = generateAccountNo();
      const spreadsheetId = await provisionSpreadsheet(email, accountNo);
      await createAccount(accountNo, email, spreadsheetId, stripeCustomerId, stripeSubscriptionId, plan);

      // Send welcome email
      const appUrl = process.env.APP_URL ?? "https://soullogic-ai-accountant.vercel.app";
      await sendEmail(
        email,
        "Welcome to SoulLogic AI Accountant",
        `<h2>Welcome! Your account is ready.</h2>
        <p>Your Account No: <strong>${accountNo}</strong></p>
        <p>Your Google Spreadsheet has been set up and is ready to use.</p>
        <p><a href="${appUrl}/login">Sign in now</a> with the Google account associated with this email.</p>
        <p>Questions? Just reply to this email.</p>`
      );

      console.log(`[stripe/webhook] Account created: ${accountNo} for ${email}`);
    } catch (err) {
      console.error("[stripe/webhook] Provisioning failed:", err);
      // Don't return 500 — Stripe will retry. Log and investigate manually.
    }
  }

  return new Response("ok", { status: 200 });
}
