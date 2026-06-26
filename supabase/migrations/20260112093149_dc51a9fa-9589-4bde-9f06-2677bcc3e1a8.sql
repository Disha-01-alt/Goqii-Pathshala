-- =============================================
-- GAMIFICATION SYSTEM
-- =============================================

-- User XP and Levels
CREATE TABLE public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  xp_this_week INTEGER DEFAULT 0,
  week_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_xp
CREATE POLICY "Users can view their own XP"
ON public.user_xp FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP"
ON public.user_xp FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP"
ON public.user_xp FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all XP"
ON public.user_xp FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view learner XP in their org"
ON public.user_xp FOR SELECT
USING (
  has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM user_organizations manager_org
    JOIN user_organizations learner_org ON manager_org.organization_id = learner_org.organization_id
    WHERE manager_org.user_id = auth.uid() AND learner_org.user_id = user_xp.user_id
  )
);

-- Badges Definition
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'award',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  category TEXT NOT NULL CHECK (category IN ('progress', 'streak', 'quiz', 'time', 'assignment')),
  criteria JSONB NOT NULL DEFAULT '{}',
  xp_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges (public read)
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
USING (true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- User Badges (Earned)
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can earn badges"
ON public.user_badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all badges"
ON public.user_badges FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view learner badges in their org"
ON public.user_badges FOR SELECT
USING (
  has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM user_organizations manager_org
    JOIN user_organizations learner_org ON manager_org.organization_id = learner_org.organization_id
    WHERE manager_org.user_id = auth.uid() AND learner_org.user_id = user_badges.user_id
  )
);

-- Learning Streaks
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  freeze_available BOOLEAN DEFAULT true,
  freeze_used_this_week DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streaks"
ON public.user_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
ON public.user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.user_streaks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all streaks"
ON public.user_streaks FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- CERTIFICATION SYSTEM
-- =============================================

-- Certificate Templates (per course)
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  min_passing_score INTEGER DEFAULT 70,
  template_name TEXT DEFAULT 'Professional',
  template_config JSONB DEFAULT '{"primary_color": "#3b82f6", "secondary_color": "#1e40af"}',
  validity_months INTEGER, -- null = never expires
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificates
CREATE POLICY "Anyone can view certificate configs"
ON public.certificates FOR SELECT
USING (true);

CREATE POLICY "Course owners can manage certificates"
ON public.certificates FOR ALL
USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.user_id = auth.uid())
);

CREATE POLICY "Admins can manage all certificates"
ON public.certificates FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- User Certificates (Issued)
CREATE TABLE public.user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES public.certificates(id),
  score INTEGER NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  verification_code TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_certificates
CREATE POLICY "Users can view their own certificates"
ON public.user_certificates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can earn certificates"
ON public.user_certificates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can verify certificates by code"
ON public.user_certificates FOR SELECT
USING (true);

CREATE POLICY "Admins can view all certificates"
ON public.user_certificates FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view learner certificates in their org"
ON public.user_certificates FOR SELECT
USING (
  has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM user_organizations manager_org
    JOIN user_organizations learner_org ON manager_org.organization_id = learner_org.organization_id
    WHERE manager_org.user_id = auth.uid() AND learner_org.user_id = user_certificates.user_id
  )
);

-- =============================================
-- TIME RESTRICTIONS
-- =============================================

-- Add time limit to modules
ALTER TABLE public.modules ADD COLUMN time_limit_minutes INTEGER;

-- Add time tracking to module_responses
ALTER TABLE public.module_responses 
  ADD COLUMN started_at TIMESTAMPTZ,
  ADD COLUMN time_spent_seconds INTEGER;

-- =============================================
-- SEED DEFAULT BADGES
-- =============================================

INSERT INTO public.badges (name, description, icon, color, category, criteria, xp_reward) VALUES
-- Progress badges
('First Steps', 'Complete your first course', 'trophy', '#f59e0b', 'progress', '{"type": "courses_completed", "value": 1}', 25),
('High Achiever', 'Complete 5 courses', 'medal', '#eab308', 'progress', '{"type": "courses_completed", "value": 5}', 100),
('Learning Champion', 'Complete 10 courses', 'crown', '#f97316', 'progress', '{"type": "courses_completed", "value": 10}', 250),

-- Streak badges
('On Fire', 'Maintain a 3-day learning streak', 'flame', '#ef4444', 'streak', '{"type": "streak_days", "value": 3}', 15),
('Dedicated Learner', 'Maintain a 7-day learning streak', 'zap', '#f97316', 'streak', '{"type": "streak_days", "value": 7}', 50),
('Unstoppable', 'Maintain a 30-day learning streak', 'star', '#eab308', 'streak', '{"type": "streak_days", "value": 30}', 200),

-- Quiz badges
('Perfect Score', 'Get 100% on any quiz', 'target', '#22c55e', 'quiz', '{"type": "perfect_quiz", "value": 1}', 30),
('Quiz Master', 'Pass 10 quizzes', 'brain', '#8b5cf6', 'quiz', '{"type": "quizzes_passed", "value": 10}', 75),
('Speed Demon', 'Complete a quiz in under 2 minutes', 'timer', '#3b82f6', 'quiz', '{"type": "quick_quiz", "value": 120}', 20),

-- Time badges
('Early Bird', 'Complete a course before deadline', 'sunrise', '#fbbf24', 'time', '{"type": "early_completion", "value": 1}', 25),
('Time Manager', 'Complete 5 courses before deadline', 'clock', '#06b6d4', 'time', '{"type": "early_completion", "value": 5}', 75),

-- Assignment badges
('Top Grade', 'Score 90%+ on an assignment', 'award', '#a855f7', 'assignment', '{"type": "high_score_assignment", "value": 90}', 40),
('Consistent Performer', 'Submit 5 assignments on time', 'check-circle', '#10b981', 'assignment', '{"type": "on_time_submissions", "value": 5}', 60);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_xp_updated_at
  BEFORE UPDATE ON public.user_xp
  FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();