// Stripe integration — spec §6.
//   POST /api/billing/checkout-session
//   POST /api/billing/webhook

import { Hono } from "npm:hono@4";
import Stripe from "npm:stripe@17";
import type { AppVariables } from "../types.ts";
import { serviceClient } from "../../_shared/supabaseClients.ts";

const app = new Hono<{ Variables: AppVariables }>();

// Lazily constructed: a missing STRIPE_SECRET_KEY must only break the
// billing routes, not crash the whole "api" function (and every other
// route in it) at import time before Stripe is configured.
let _stripe: Stripe | undefined;
function stripeClient(): Stripe {
  if (!_stripe) {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}

const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";

// §6.1 — app plan ID -> Stripe Price ID, both directions.
function planToPrice(): Record<string, string> {
  return {
    monthly: Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "",
    yearly: Deno.env.get("STRIPE_PRICE_YEARLY") ?? "",
    teacher: Deno.env.get("STRIPE_PRICE_TEACHER") ?? "",
    choir: Deno.env.get("STRIPE_PRICE_CHOIR") ?? "",
  };
}
function priceToPlan(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(planToPrice())
      .filter(([, price]) => price)
      .map(([plan, price]) => [price, plan]),
  );
}

// §6.2 — replaces the simulated client-side checkout.
app.post("/checkout-session", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));

  const priceId = planToPrice()[body.planId];
  if (!priceId) {
    return c.json({ error: "planId must be one of monthly/yearly/teacher/choir" }, 400);
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("email, stripe_customer_id")
    .eq("id", userId)
    .single();
  if (error) return c.json({ error: error.message }, 400);

  const stripe = stripeClient();

  let customerId = user.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/?checkout=success`,
    cancel_url: `${APP_URL}/?checkout=cancelled`,
    metadata: { supabase_user_id: userId, plan_id: body.planId },
  });

  return c.json({ url: session.url });
});

// §6.3 — Stripe calls this directly; no user JWT, verified by signature
// instead. Uses the service-role client since it must write to whichever
// user's row matches the Stripe customer, not "the caller's own row".
app.post("/webhook", async (c) => {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) return c.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, 500);

  const signature = c.req.header("stripe-signature");
  const rawBody = await c.req.text();
  const stripe = stripeClient();
  const PRICE_TO_PLAN = priceToPlan();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature!, webhookSecret);
  } catch (err) {
    return c.json({ error: `Webhook signature verification failed: ${(err as Error).message}` }, 400);
  }

  const supabase = serviceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });
      const priceId = full.line_items?.data[0]?.price?.id;
      const planId = priceId ? PRICE_TO_PLAN[priceId] : undefined;

      await supabase
        .from("users")
        .update({
          subscription_plan: planId ?? null,
          stripe_customer_id: session.customer as string,
          payment_failed_at: null,
        })
        .eq("stripe_customer_id", session.customer as string);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id;
      const planId = priceId ? PRICE_TO_PLAN[priceId] : undefined;

      await supabase
        .from("users")
        .update({ subscription_plan: planId ?? null, payment_failed_at: null })
        .eq("stripe_customer_id", subscription.customer as string);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("users")
        .update({ subscription_plan: null })
        .eq("stripe_customer_id", subscription.customer as string);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase
        .from("users")
        .update({ payment_failed_at: new Date().toISOString() })
        .eq("stripe_customer_id", invoice.customer as string);
      break;
    }
  }

  return c.json({ received: true });
});

export default app;
