-- trial_start_date is server-only too. The 21-day trial is worked out from it (isInTrial()), so a user who could write
-- it straight through PostgREST could restart the trial, or push it forward, and keep full access for free. It gets the
-- same rule as the billing columns in 0006: a change made as authenticated/anon is rejected. The trial is granted by
-- handle_new_user() (0001, security definer, on signup), which this doesn't touch; service_role and migrations can
-- still change it.
-- Verified against the linked project by scripts/billing-verify/protected-columns.js.

create or replace function public.users_protect_billing_columns() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.subscription_plan is distinct from old.subscription_plan
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.payment_failed_at is distinct from old.payment_failed_at
    or new.trial_start_date is distinct from old.trial_start_date) then
    raise exception 'subscription_plan, stripe_customer_id, payment_failed_at and trial_start_date can only be changed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
