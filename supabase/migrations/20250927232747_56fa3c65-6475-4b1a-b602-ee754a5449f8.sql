-- Fix the leaderboard view security issue by ensuring proper ownership and RLS behavior
-- Since we can't change ownership from postgres, we'll recreate it differently

-- First drop the problematic view completely
DROP VIEW IF EXISTS public.leaderboard CASCADE;

-- Create a proper table-based leaderboard instead of a view to avoid SECURITY DEFINER issues
-- This approach will be more secure and performant
CREATE TABLE public.leaderboard (
  rank bigint,
  score integer,
  completion_time integer,
  total_questions integer,
  date_achieved date,
  updated_at timestamp with time zone default now()
);

-- Enable RLS on the leaderboard table
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (since leaderboards are typically public)
CREATE POLICY "Allow public read access to leaderboard" 
ON public.leaderboard 
FOR SELECT 
USING (true);

-- Create a function to refresh the leaderboard data
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing leaderboard data
  TRUNCATE public.leaderboard;
  
  -- Populate with current top scores
  INSERT INTO public.leaderboard (rank, score, completion_time, total_questions, date_achieved)
  SELECT 
    row_number() OVER (ORDER BY s.score DESC, s.completion_time) AS rank,
    s.score,
    s.completion_time,
    s.total_questions,
    s.created_at::date AS date_achieved
  FROM public.scores s
  WHERE s.score IS NOT NULL
  ORDER BY s.score DESC, s.completion_time
  LIMIT 100;
  
  -- Update the refresh timestamp
  UPDATE public.leaderboard SET updated_at = now();
END;
$$;

-- Initially populate the leaderboard
SELECT public.refresh_leaderboard();