-- IELTS AI Master Schema Setup

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    current_band NUMERIC(2, 1) DEFAULT 3.0,
    target_band NUMERIC(2, 1) DEFAULT 7.5,
    exam_date DATE,
    daily_goal_minutes INTEGER DEFAULT 30,
    xp_points INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow individual write for profile owners" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL CHECK (level IN ('Foundation', 'Intermediate', 'Advanced')),
    estimated_band_range TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT, -- Markdown format
    skill_category TEXT NOT NULL CHECK (skill_category IN ('Listening', 'Reading', 'Writing', 'Speaking', 'Vocabulary', 'Grammar')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Practice Tests
CREATE TABLE IF NOT EXISTS public.practice_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Full Mock', 'Listening', 'Reading', 'Writing', 'Speaking')),
    duration_minutes INTEGER NOT NULL,
    content JSONB NOT NULL, -- Contains full test questions, options, answers, audio urls
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Test Results
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.practice_tests(id) ON DELETE CASCADE,
    overall_band NUMERIC(2, 1),
    listening_band NUMERIC(2, 1),
    reading_band NUMERIC(2, 1),
    writing_band NUMERIC(2, 1),
    speaking_band NUMERIC(2, 1),
    answers JSONB, -- User answers log
    feedback JSONB, -- AI overall feedback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own test results" ON public.test_results
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own test results" ON public.test_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Vocabulary database
CREATE TABLE IF NOT EXISTS public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL UNIQUE,
    definition TEXT NOT NULL,
    ipa TEXT, -- International Phonetic Alphabet pronunciation
    audio_url TEXT,
    band_level NUMERIC(2, 1) DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. User Flashcards & retention status
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vocab_id UUID REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    retention_rate NUMERIC(3, 2) DEFAULT 0.0, -- Spaced repetition status
    repetition_count INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 1,
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, vocab_id)
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id);

-- 8. Study Sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    activity_type TEXT NOT NULL, -- e.g., 'Writing Evaluation', 'Speaking Practice', 'AI Tutor', 'Vocabulary'
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own study sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 9. Essays
CREATE TABLE IF NOT EXISTS public.essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own essays" ON public.essays
    FOR ALL USING (auth.uid() = user_id);

-- 10. Essay Feedback
CREATE TABLE IF NOT EXISTS public.essay_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE,
    estimated_band NUMERIC(2, 1) NOT NULL,
    task_achievement_score NUMERIC(2, 1) NOT NULL,
    coherence_cohesion_score NUMERIC(2, 1) NOT NULL,
    lexical_resource_score NUMERIC(2, 1) NOT NULL,
    grammar_accuracy_score NUMERIC(2, 1) NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    suggested_improvements TEXT[],
    improved_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.essay_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view essay feedback through join" ON public.essay_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.essays 
            WHERE public.essays.id = public.essay_feedback.essay_id 
            AND public.essays.user_id = auth.uid()
        )
    );

-- 11. Speaking Records
CREATE TABLE IF NOT EXISTS public.speaking_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.speaking_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage speaking records" ON public.speaking_records
    FOR ALL USING (auth.uid() = user_id);

-- 12. Speaking Feedback
CREATE TABLE IF NOT EXISTS public.speaking_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    speaking_record_id UUID REFERENCES public.speaking_records(id) ON DELETE CASCADE,
    estimated_band NUMERIC(2, 1) NOT NULL,
    fluency_score NUMERIC(2, 1) NOT NULL,
    pronunciation_score NUMERIC(2, 1) NOT NULL,
    vocabulary_score NUMERIC(2, 1) NOT NULL,
    grammar_score NUMERIC(2, 1) NOT NULL,
    detailed_feedback TEXT NOT NULL,
    suggested_improvements TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.speaking_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view speaking feedback through join" ON public.speaking_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.speaking_records 
            WHERE public.speaking_records.id = public.speaking_feedback.speaking_record_id 
            AND public.speaking_records.user_id = auth.uid()
        )
    );

-- 13. Chat Sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New AI Tutor Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chat sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 14. Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view chat messages in their sessions" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE public.chat_sessions.id = public.chat_messages.session_id 
            AND public.chat_sessions.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert chat messages in their sessions" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE public.chat_sessions.id = public.chat_messages.session_id 
            AND public.chat_sessions.user_id = auth.uid()
        )
    );

-- 15. Achievements Definition
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    badge_icon TEXT NOT NULL,
    xp_value INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 16. User Achievements mapping
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- 17. Leaderboard Entries
CREATE TABLE IF NOT EXISTS public.leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    weekly_xp INTEGER DEFAULT 0,
    rank INTEGER,
    week_start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for leaderboard" ON public.leaderboards
    FOR SELECT USING (true);

-- Triggers to auto create user profiles on auth.users inserts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, current_band, target_band)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'IELTS Learner'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    3.0,
    7.5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Index creation for optimization
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON public.essays(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_records_user_id ON public.speaking_records(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
