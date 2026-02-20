-- =============================================================
-- Book Club App — Full Schema
-- =============================================================
-- Consolidated migration file. Safe to re-run (idempotent).
-- Run this in the Supabase SQL Editor to set up or reset
-- all tables, policies, and triggers.
-- =============================================================


-- ─── 1. Profiles ─────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Add columns if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'display_name') then
    alter table public.profiles add column display_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'is_admin') then
    alter table public.profiles add column is_admin boolean default false;
  end if;
end $$;

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── 2. Books ────────────────────────────────────────────────

create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  description text,
  genre text,
  status text not null check (status in ('current', 'past', 'future')),
  cover_image_url text,
  meeting_date date,
  meeting_location text,
  suggested_by uuid references public.profiles(id),
  user_recommended_reason text,
  date_read date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add columns that may be missing on older installs
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'books' and column_name = 'cover_image_url') then
    alter table public.books add column cover_image_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'books' and column_name = 'genre') then
    alter table public.books add column genre text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'books' and column_name = 'user_recommended_reason') then
    alter table public.books add column user_recommended_reason text;
  end if;
end $$;

-- Fix suggested_by FK to point at profiles (not auth.users)
alter table public.books drop constraint if exists books_suggested_by_fkey;
alter table public.books
  add constraint books_suggested_by_fkey
  foreign key (suggested_by) references public.profiles(id);

-- RLS
alter table public.books enable row level security;

drop policy if exists "Books are viewable by everyone." on books;
create policy "Books are viewable by everyone."
  on books for select
  using ( true );

drop policy if exists "Users can suggest future books." on books;
create policy "Users can suggest future books."
  on books for insert
  with check ( auth.role() = 'authenticated' and status = 'future' );

drop policy if exists "Admins can update books." on books;
create policy "Admins can update books."
  on books for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Allow any authenticated user to update (for cover saves, etc.)
drop policy if exists "Allow authenticated users to update books" on books;
create policy "Allow authenticated users to update books"
  on books for update
  to authenticated
  using (true);

drop policy if exists "Admins can delete books." on books;
create policy "Admins can delete books."
  on books for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );


-- ─── 3. Votes ────────────────────────────────────────────────

create table if not exists public.votes (
  book_id uuid references public.books(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (book_id, user_id)
);

alter table public.votes enable row level security;

drop policy if exists "Votes are viewable by everyone." on votes;
create policy "Votes are viewable by everyone."
  on votes for select
  using ( true );

drop policy if exists "Users can insert their own votes." on votes;
create policy "Users can insert their own votes."
  on votes for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can delete their own votes." on votes;
create policy "Users can delete their own votes."
  on votes for delete
  using ( auth.uid() = user_id );


-- ─── 4. Ratings ──────────────────────────────────────────────

create table if not exists public.ratings (
  book_id uuid references public.books(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (book_id, user_id)
);

alter table public.ratings enable row level security;

drop policy if exists "Ratings are viewable by everyone." on ratings;
create policy "Ratings are viewable by everyone."
  on ratings for select
  using ( true );

drop policy if exists "Users can insert their own ratings." on ratings;
create policy "Users can insert their own ratings."
  on ratings for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own ratings." on ratings;
create policy "Users can update their own ratings."
  on ratings for update
  using ( auth.uid() = user_id );
