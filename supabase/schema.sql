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
