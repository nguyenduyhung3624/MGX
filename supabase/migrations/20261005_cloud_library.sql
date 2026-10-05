begin;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Reader' check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id uuid not null,
  title text not null check (char_length(title) between 1 and 1000),
  cover text check (cover is null or char_length(cover) <= 256),
  status text not null default '' check (char_length(status) <= 100),
  saved_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);

create table if not exists public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id uuid not null,
  chapter_id uuid not null,
  chapter text not null default '?' check (char_length(chapter) <= 100),
  read_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);

create index if not exists user_library_user_saved_at_idx
  on public.user_library (user_id, saved_at desc);

create index if not exists reading_progress_user_read_at_idx
  on public.reading_progress (user_id, read_at desc);

alter table public.profiles enable row level security;
alter table public.user_library enable row level security;
alter table public.reading_progress enable row level security;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own library" on public.user_library;
create policy "Users manage own library"
  on public.user_library
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own reading progress" on public.reading_progress;
create policy "Users manage own reading progress"
  on public.reading_progress
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'Reader'), '@', 1), 'Reader')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (user_id, display_name)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(email, 'Reader'), '@', 1), 'Reader')
from auth.users
on conflict (user_id) do nothing;

commit;
