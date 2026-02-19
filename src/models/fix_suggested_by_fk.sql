-- Fix: Add a foreign key from books.suggested_by to public.profiles(id)
-- PostgREST cannot join across the auth schema, so we need this FK
-- to let us query profiles.display_name for the book suggester.

-- Drop the old FK to auth.users if it exists
ALTER TABLE public.books
  DROP CONSTRAINT IF EXISTS books_suggested_by_fkey;

-- Add new FK to public.profiles
ALTER TABLE public.books
  ADD CONSTRAINT books_suggested_by_fkey
  FOREIGN KEY (suggested_by) REFERENCES public.profiles(id);
