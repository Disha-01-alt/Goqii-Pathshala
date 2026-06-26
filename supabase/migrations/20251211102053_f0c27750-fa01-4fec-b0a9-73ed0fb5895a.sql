-- Create assessment status enum
CREATE TYPE public.assessment_status AS ENUM ('not_submitted', 'submitted', 'graded', 'needs_revision');

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  max_score INTEGER NOT NULL DEFAULT 100,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create course_assessments junction table
CREATE TABLE public.course_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, assessment_id)
);

-- Create assessment_submissions table
CREATE TABLE public.assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.assessment_status NOT NULL DEFAULT 'not_submitted',
  submitted_files JSONB DEFAULT '[]'::jsonb,
  response_text TEXT,
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 100,
  manager_comments TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, course_id, user_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Assessments RLS policies
CREATE POLICY "Managers and admins can create assessments"
ON public.assessments FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers and admins can view all assessments"
ON public.assessments FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Creators can update their assessments"
ON public.assessments FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their assessments"
ON public.assessments FOR DELETE
USING (created_by = auth.uid());

CREATE POLICY "Learners can view assessments in their courses"
ON public.assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_assessments ca
    JOIN courses c ON c.id = ca.course_id
    JOIN learner_levels ll ON ll.level_id = c.level_id
    WHERE ca.assessment_id = assessments.id
    AND ll.user_id = auth.uid()
  )
);

-- Course Assessments RLS policies
CREATE POLICY "Course owners can manage course assessments"
ON public.course_assessments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses WHERE id = course_assessments.course_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses WHERE id = course_assessments.course_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Learners can view course assessments in their level"
ON public.course_assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN learner_levels ll ON ll.level_id = c.level_id
    WHERE c.id = course_assessments.course_id
    AND ll.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can view all course assessments"
ON public.course_assessments FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Assessment Submissions RLS policies
CREATE POLICY "Learners can create their own submissions"
ON public.assessment_submissions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Learners can view their own submissions"
ON public.assessment_submissions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Learners can update their own ungraded submissions"
ON public.assessment_submissions FOR UPDATE
USING (user_id = auth.uid() AND status IN ('not_submitted', 'submitted', 'needs_revision'));

CREATE POLICY "Managers can view all submissions"
ON public.assessment_submissions FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can grade submissions"
ON public.assessment_submissions FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Add policy for managers to view course progress
CREATE POLICY "Managers can view all course progress"
ON public.course_progress FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessment_submissions_updated_at
BEFORE UPDATE ON public.assessment_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify manager when learner submits
CREATE OR REPLACE FUNCTION public.notify_manager_on_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_owner_id UUID;
  learner_name TEXT;
  assessment_title TEXT;
  course_title TEXT;
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Get course owner
    SELECT c.user_id, c.title INTO course_owner_id, course_title
    FROM courses c WHERE c.id = NEW.course_id;
    
    -- Get learner name
    SELECT COALESCE(full_name, email) INTO learner_name
    FROM profiles WHERE id = NEW.user_id;
    
    -- Get assessment title
    SELECT title INTO assessment_title
    FROM assessments WHERE id = NEW.assessment_id;
    
    -- Create notification for manager
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      course_owner_id,
      'submission_received',
      'New Submission Received',
      learner_name || ' has submitted "' || assessment_title || '" for ' || course_title,
      jsonb_build_object(
        'submission_id', NEW.id,
        'assessment_id', NEW.assessment_id,
        'course_id', NEW.course_id,
        'learner_id', NEW.user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to notify learner when graded
CREATE OR REPLACE FUNCTION public.notify_learner_on_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assessment_title TEXT;
  course_title TEXT;
BEGIN
  IF NEW.status = 'graded' AND OLD.status != 'graded' THEN
    -- Get assessment title
    SELECT title INTO assessment_title
    FROM assessments WHERE id = NEW.assessment_id;
    
    -- Get course title
    SELECT title INTO course_title
    FROM courses WHERE id = NEW.course_id;
    
    -- Create notification for learner
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'assignment_graded',
      'Assessment Graded',
      'Your submission for "' || assessment_title || '" has been graded. Score: ' || NEW.score || '/' || NEW.max_score,
      jsonb_build_object(
        'submission_id', NEW.id,
        'assessment_id', NEW.assessment_id,
        'course_id', NEW.course_id,
        'score', NEW.score,
        'max_score', NEW.max_score
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for notifications
CREATE TRIGGER on_submission_notify_manager
AFTER INSERT OR UPDATE ON public.assessment_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_manager_on_submission();

CREATE TRIGGER on_grade_notify_learner
AFTER UPDATE ON public.assessment_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_learner_on_grade();