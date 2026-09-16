-- Real storage for the in-app feedback form, replacing the client-only
-- window.storage('feedback') blob. Anyone (signed in or not) can submit;
-- nobody can read back through the anon/authenticated roles — this is an
-- admin-only inbox, read via the dashboard or service role.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  liked text,
  disliked text,
  confusing text,
  difficult text,
  most_used text,
  improve text,
  add_feature text,
  bugs text,
  rating integer check (rating between 0 and 5),
  other_notes text,
  submitted_at timestamptz not null default now()
);

comment on table public.feedback is 'In-app feedback form submissions. Insert-only from the client; no select policy — read via service role.';

alter table public.feedback enable row level security;

create policy "anyone can submit feedback" on public.feedback
  for insert with check (true);
