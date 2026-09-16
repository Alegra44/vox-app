# Testing §6 (Stripe) manually

Not scripted like `smoke-test.sh` because it needs a real Stripe test-mode
account and the Stripe CLI. Steps:

1. Create 4 test-mode Products/Prices in Stripe matching §6.1 (monthly $9.99,
   yearly $79.00, teacher $29.00/mo, choir $79.00/mo), and set their Price IDs
   as `STRIPE_PRICE_MONTHLY` / `_YEARLY` / `_TEACHER` / `_CHOIR` secrets.
2. `stripe listen --forward-to "$SUPABASE_URL/functions/v1/api/billing/webhook"`
   — copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
3. Get a user JWT the same way `smoke-test.sh` does (admin-create + password
   grant), then:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"planId":"monthly"}' "$SUPABASE_URL/functions/v1/api/billing/checkout-session"
   ```
   Open the returned `url` in a browser and pay with Stripe's test card
   `4242 4242 4242 4242`, any future expiry, any CVC.
4. Confirm the webhook fired (`stripe listen` logs it, function logs show
   `checkout.session.completed`), then re-fetch `GET /api/me` — the same
   test user should now show `"subscription_plan":"monthly"`.
5. `stripe trigger invoice.payment_failed` (or use Stripe's dashboard to
   simulate) and re-check `GET /api/me` for a non-null `payment_failed_at`.
