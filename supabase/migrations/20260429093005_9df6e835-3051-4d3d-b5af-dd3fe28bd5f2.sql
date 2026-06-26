-- Module assignment submissions: per-learner submissions for module-level assignments
CREATE TABLE public.module_assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_assignment_id UUID NOT NULL,
  module_id UUID NOT NULL,
  course_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_submitted',
  submitted_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_text TEXT,
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 100,
  manager_comments TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT module_assignment_submissions_status_check
    CHECK (status IN ('not_submitted','submitted','graded','needs_revision')),
  CONSTRAINT module_assignment_submissions_unique
    UNIQUE (module_assignment_id, user_id, course_id)
);

CREATE INDEX idx_mas_user ON public.module_assignment_submissions(user_id);
CREATE INDEX idx_mas_module ON public.module_assignment_submissions(module_id);
CREATE INDEX idx_mas_course ON public.module_assignment_submissions(course_id);

ALTER TABLE public.module_assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Learners: full self-access
CREATE POLICY "Learners can view own module assignment submissions"
ON public.module_assignment_submissions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Learners can create own module assignment submissions"
ON public.module_assignment_submissions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Learners can update own ungraded module assignment submissions"
ON public.module_assignment_submissions FOR UPDATE
USING (user_id = auth.uid() AND status IN ('not_submitted','submitted','needs_revision'));

-- Admins: full access
CREATE POLICY "Admins can view all module assignment submissions"
ON public.module_assignment_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all module assignment submissions"
ON public.module_assignment_submissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers: view & grade
CREATE POLICY "Managers can view all module assignment submissions"
ON public.module_assignment_submissions FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can grade module assignment submissions"
ON public.module_assignment_submissions FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- SMEs: view submissions for their own modules
CREATE POLICY "SMEs can view submissions for own modules"
ON public.module_assignment_submissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.modules m
  WHERE m.id = module_assignment_submissions.module_id AND m.user_id = auth.uid()
));

-- Updated_at trigger
CREATE TRIGGER update_mas_updated_at
BEFORE UPDATE ON public.module_assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify learner on grade (reuses pattern of notify_learner_on_grade)
CREATE OR REPLACE FUNCTION public.notify_learner_on_module_assignment_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  assignment_title TEXT;
  module_title TEXT;
BEGIN
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status <> 'graded') THEN
    SELECT title INTO assignment_title FROM module_assignments WHERE id = NEW.module_assignment_id;
    SELECT title INTO module_title FROM modules WHERE id = NEW.module_id;

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'assignment_graded',
      'Assignment Graded',
      'Your submission for "' || COALESCE(assignment_title, 'Assignment') || '" in module "' || COALESCE(module_title, '') || '" has been graded. Score: ' || COALESCE(NEW.score::text,'0') || '/' || NEW.max_score,
      jsonb_build_object(
        'submission_id', NEW.id,
        'module_assignment_id', NEW.module_assignment_id,
        'module_id', NEW.module_id,
        'course_id', NEW.course_id,
        'score', NEW.score,
        'max_score', NEW.max_score
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_learner_on_module_assignment_grade
AFTER UPDATE ON public.module_assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_learner_on_module_assignment_grade();
