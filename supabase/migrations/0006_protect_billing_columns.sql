-- Billing columns are server-only. The "users update own row" policy (0001) lets a signed-in user update any column of
-- their own row straight through PostgREST with their own JWT, which skips the api function's allow-list
-- (USERS_PATCHABLE_COLUMNS): a user could give themselves a plan. RLS can't restrict columns, so a trigger does it, on
-- every write path: a change to subscription_plan, stripe_customer_id or payment_failed_at made as the client roles
-- (authenticated, anon) is rejected. Privileged paths still write them: the Stripe webhook (service_role),
-- security definer functions (they run as their owner) and migrations. Writing a column's current value back is not a
-- change, so a whole-row write that leaves them as they are still goes through.
-- Verified against the linked project by scripts/billing-verify/protected-columns.js.

create function public.users_protect_billing_columns() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.subscription_plan is distinct from old.subscription_plan
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.payment_failed_at is distinct from old.payment_failed_at) then
    raise exception 'subscription_plan, stripe_customer_id and payment_failed_at can only be changed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger users_protect_billing_columns before update on public.users
  for each row execute function public.users_protect_billing_columns();
