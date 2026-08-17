import { NextRequest } from "next/server";
import Stripe from "stripe";
import { ok, error } from "@/lib/utils/api-helpers";

// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER!,
  pro: process.env.STRIPE_PRICE_ID_PRO!,
};

export async function POST(req: NextRequest) {
  try {
    const { email, plan = "pro" } = await req.json();
    if (!email) return error("Email is required", 400);

    const priceId = PRICE_IDS[plan];
    if (!priceId) return error("Invalid plan", 400);

    const appUrl = process.env.APP_URL ?? "https://soullogic-ai-accountant.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { plan },
      },
      success_url: `${appUrl}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup`,
      metadata: { email, plan },
    });

    return ok({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return error("Failed to create checkout session");
  }
}
