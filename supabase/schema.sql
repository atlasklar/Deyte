-- Deyte: run once in Supabase → SQL Editor → New query → Run.

-- Each account's coach data (profile, memory, people, chats), private to its owner.
create table if not exists public.account_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.account_data enable row level security;

drop policy if exists "Owners read their data" on public.account_data;
create policy "Owners read their data" on public.account_data
  for select using (auth.uid() = user_id);

drop policy if exists "Owners insert their data" on public.account_data;
create policy "Owners insert their data" on public.account_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "Owners update their data" on public.account_data;
create policy "Owners update their data" on public.account_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners delete their data" on public.account_data;
create policy "Owners delete their data" on public.account_data
  for delete using (auth.uid() = user_id);

-- Profile photos: public to view, only the owner can write into their own folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users upload their avatar" on storage.objects;
create policy "Users upload their avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users replace their avatar" on storage.objects;
create policy "Users replace their avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users delete their avatar" on storage.objects;
create policy "Users delete their avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Photos: the files stay viewable by link (public bucket), but only the owner
-- can list their own folder, so nobody can enumerate other members' photos.
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Users list their avatars" on storage.objects;
create policy "Users list their avatars" on storage.objects
  for select using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Coach usage limits (protects the AI bill from spam). Clients can't touch the
-- table directly; use_coach() checks the limits and logs the call in one step.
create table if not exists public.coach_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
create index if not exists coach_usage_user_kind_at on public.coach_usage (user_id, kind, at desc);
create index if not exists coach_usage_at on public.coach_usage (at desc);
alter table public.coach_usage enable row level security;

create or replace function public.use_coach(p_kind text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  per_hour int := case p_kind when 'chat' then 40 when 'extract' then 15 when 'retone' then 60 else 0 end;
  per_day int := case p_kind when 'chat' then 300 when 'extract' then 60 when 'retone' then 400 else 0 end;
  used_hour int;
  used_day int;
  everyone_minute int;
begin
  if uid is null then return json_build_object('allowed', false, 'reason', 'signed_out'); end if;
  if per_hour = 0 then return json_build_object('allowed', false, 'reason', 'unknown'); end if;
  select count(*) filter (where at > now() - interval '1 hour'), count(*)
    into used_hour, used_day
    from coach_usage where user_id = uid and kind = p_kind and at > now() - interval '1 day';
  if used_hour >= per_hour then return json_build_object('allowed', false, 'reason', 'hour'); end if;
  if used_day >= per_day then return json_build_object('allowed', false, 'reason', 'day'); end if;
  -- Circuit breaker across all members (mass sign-up abuse).
  select count(*) into everyone_minute from coach_usage where at > now() - interval '1 minute';
  if everyone_minute >= 600 then return json_build_object('allowed', false, 'reason', 'busy'); end if;
  insert into coach_usage (user_id, kind) values (uid, p_kind);
  delete from coach_usage where user_id = uid and at < now() - interval '2 days';
  return json_build_object('allowed', true);
end;
$$;
revoke all on function public.use_coach(text) from public, anon;
grant execute on function public.use_coach(text) to authenticated;
