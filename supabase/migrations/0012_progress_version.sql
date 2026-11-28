-- Release J (design/reliability/RELEASE_J.md, J1; Survey J, SURVEY_J.md): a version on the progress row, so a save from a page that hasn't
-- seen the row's latest version is refused (409) and the page merges instead of overwriting another device's progress.
-- version: bumped by the database on every update (any path), never written by a client.
-- last_save_id / recent_save_ids: the client's id for each save, the last 8 kept, so a page can tell its own save in a
-- row it reads back (a save retried after its first try did land, release A; a read answered after the page's own save
-- landed) and merge only what that save didn't carry, instead of counting it twice.
alter table public.user_progress add column version bigint not null default 0;
alter table public.user_progress add column last_save_id uuid;
alter table public.user_progress add column recent_save_ids uuid[] not null default '{}';

create function public.user_progress_bump_version() returns trigger language plpgsql as $$
begin
  new.version := old.version + 1;
  if new.last_save_id is not null and new.last_save_id is distinct from old.last_save_id then
    new.recent_save_ids := (old.recent_save_ids || new.last_save_id)[greatest(1, cardinality(old.recent_save_ids) - 6):];
  else
    new.recent_save_ids := old.recent_save_ids;
  end if;
  return new;
end $$;

create trigger user_progress_bump_version before update on public.user_progress
  for each row execute function public.user_progress_bump_version();
