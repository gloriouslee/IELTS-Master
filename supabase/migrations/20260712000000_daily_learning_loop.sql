ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preferred_skills TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS vietnamese_meaning TEXT,
  ADD COLUMN IF NOT EXISTS part_of_speech TEXT,
  ADD COLUMN IF NOT EXISTS examples TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS collocations TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS learned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_test_score NUMERIC(3,2);

CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 10,
  target_url TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, task_date, activity_type)
);

CREATE TABLE IF NOT EXISTS public.daily_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily tasks" ON public.daily_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own task completions" ON public.daily_task_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON public.daily_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_daily_completions_user ON public.daily_task_completions(user_id, completed_at);
