-- Run this in your Supabase SQL Editor
-- Fixes two issues:
-- 1. Adds the cover_image_url column if it doesn't exist
-- 2. Adds an RLS policy allowing authenticated users to update books

-- Step 1: Add cover_image_url column (safe to run if it already exists)
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Step 2: Copy any existing cover_url values to cover_image_url
UPDATE public.books
  SET cover_image_url = cover_url
  WHERE cover_url IS NOT NULL
    AND cover_image_url IS NULL;

-- Step 3: Add RLS policy for authenticated users to update books
-- (Drop first in case it already exists, to avoid duplicate error)
DROP POLICY IF EXISTS "Allow authenticated users to update books" ON public.books;

CREATE POLICY "Allow authenticated users to update books"
  ON public.books
  FOR UPDATE
  TO authenticated
  USING (true);
