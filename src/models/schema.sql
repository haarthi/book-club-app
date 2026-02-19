
-- Books table
create table public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  cover_url text,
  description text,
  status text not null check (status in ('current', 'past', 'future')),
  meeting_date date,
  meeting_location text,
  suggested_by uuid references public.profiles(id),
  date_read date, -- For past books
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Votes table
create table public.votes (
  book_id uuid references public.books(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (book_id, user_id)
);

-- Ratings table
create table public.ratings (
  book_id uuid references public.books(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (book_id, user_id)
);

-- Add is_admin to profiles if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'is_admin') then
    alter table public.profiles add column is_admin boolean default false;
  end if;
end $$;

-- Enable RLS
alter table public.books enable row level security;
alter table public.votes enable row level security;
alter table public.ratings enable row level security;

-- Policies

-- Books: Everyone can read
create policy "Books are viewable by everyone."
  on books for select
  using ( true );

-- Books: Authenticated users can insert future books
create policy "Users can suggest future books."
  on books for insert
  with check ( auth.role() = 'authenticated' and status = 'future' );

-- Books: Only admins can update (promote/demote)
-- Note: You'll need to create a function or just rely on RLS if Supabase auth.uid() lookup works in policies with joins, 
-- but a simple check on profiles.is_admin is better handled if we trust the claimed user or use a secure definer function.
-- For simplicity in client-side calls, we check the user's ID against the profiles table.
create policy "Admins can update books."
  on books for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can delete books."
  on books for delete
  using (
      exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );


-- Votes: Viewable by everyone
create policy "Votes are viewable by everyone."
  on votes for select
  using ( true );

-- Votes: Users can vote/unvote
create policy "Users can insert their own votes."
  on votes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own votes."
  on votes for delete
  using ( auth.uid() = user_id );

-- Ratings: Viewable by everyone
create policy "Ratings are viewable by everyone."
  on ratings for select
  using ( true );

-- Ratings: Users can insert/update their own ratings
create policy "Users can insert their own ratings."
  on ratings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own ratings."
  on ratings for update
  using ( auth.uid() = user_id );
