-- Drop the existing leaderboard view that has security definer behavior
DROP VIEW IF EXISTS public.leaderboard;

-- Recreate the leaderboard view without security definer behavior
-- This will respect RLS policies on the scores table
CREATE VIEW public.leaderboard AS
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

-- Grant appropriate permissions to authenticated and anonymous users
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;