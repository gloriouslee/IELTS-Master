-- Per-user vocabulary bank (replaces browser-only localStorage storage).
CREATE TABLE IF NOT EXISTS public.vocabulary_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL CHECK (char_length(word) BETWEEN 1 AND 120),
  ipa TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL DEFAULT '',
  vietnamese_meaning TEXT,
  part_of_speech TEXT,
  topic TEXT,
  folder TEXT NOT NULL DEFAULT 'General',
  collocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  synonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  learned BOOLEAN NOT NULL DEFAULT FALSE,
  retention_rate INTEGER NOT NULL DEFAULT 0 CHECK (retention_rate BETWEEN 0 AND 100),
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetition_count INTEGER NOT NULL DEFAULT 0,
  ease_factor NUMERIC(3, 2) NOT NULL DEFAULT 2.5,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_cards_user_word
  ON public.vocabulary_cards(user_id, lower(word));
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_user_due
  ON public.vocabulary_cards(user_id, next_review_at);

ALTER TABLE public.vocabulary_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own vocabulary cards" ON public.vocabulary_cards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
