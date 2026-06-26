-- Create module_quizzes table for storing quiz data separately
CREATE TABLE public.module_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  quiz_ai_used text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create module_assignments table for storing assignment data separately
CREATE TABLE public.module_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  title text NOT NULL,
  goal text,
  instructions text,
  expected_output text,
  evaluation_criteria jsonb DEFAULT '[]'::jsonb,
  rubric jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_module_quizzes_module_id ON public.module_quizzes(module_id);
CREATE INDEX idx_module_assignments_module_id ON public.module_assignments(module_id);

-- Enable RLS
ALTER TABLE public.module_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_assignments ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on module_quizzes
CREATE TRIGGER update_module_quizzes_updated_at
  BEFORE UPDATE ON public.module_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- RLS Policies for module_quizzes
-- =====================

-- Admins have full access
CREATE POLICY "Admins can manage all quizzes"
  ON public.module_quizzes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SMEs can manage quizzes for their own modules
CREATE POLICY "SMEs can insert quizzes for own modules"
  ON public.module_quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_quizzes.module_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "SMEs can update quizzes for own modules"
  ON public.module_quizzes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_quizzes.module_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "SMEs can view quizzes for own modules"
  ON public.module_quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_quizzes.module_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "SMEs can delete quizzes for own modules"
  ON public.module_quizzes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_quizzes.module_id
      AND m.user_id = auth.uid()
    )
  );

-- SME Experts can view and update all quizzes
CREATE POLICY "SME Experts can view all quizzes"
  ON public.module_quizzes FOR SELECT
  USING (has_role(auth.uid(), 'sme_expert'::app_role));

CREATE POLICY "SME Experts can update quizzes"
  ON public.module_quizzes FOR UPDATE
  USING (has_role(auth.uid(), 'sme_expert'::app_role));

-- Managers can view quizzes for modules in accessible courses
CREATE POLICY "Managers can view quizzes in accessible courses"
  ON public.module_quizzes FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.module_id = module_quizzes.module_id
      AND c.is_published = true
    )
  );

-- Learners can view quizzes for modules in assigned courses
CREATE POLICY "Learners can view quizzes in assigned courses"
  ON public.module_quizzes FOR SELECT
  USING (
    has_role(auth.uid(), 'learner'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.course_assignments ca ON ca.course_id = cm.course_id
      WHERE cm.module_id = module_quizzes.module_id
      AND ca.user_id = auth.uid()
    )
  );

-- =====================
-- RLS Policies for module_assignments
-- =====================

-- Admins have full access
CREATE POLICY "Admins can manage all assignments"
  ON public.module_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SMEs can manage assignments for their own modules
CREATE POLICY "SMEs can insert assignments for own modules"
  ON public.module_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_assignments.module_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "SMEs can update assignments for own modules"
  ON public.module_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_assignments.module_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "SMEs can view assignments for own modules"
  ON public.module_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_assignments.module_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "SMEs can delete assignments for own modules"
  ON public.module_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_assignments.module_id
      AND m.user_id = auth.uid()
    )
  );

-- SME Experts can view and update all assignments
CREATE POLICY "SME Experts can view all assignments"
  ON public.module_assignments FOR SELECT
  USING (has_role(auth.uid(), 'sme_expert'::app_role));

CREATE POLICY "SME Experts can update assignments"
  ON public.module_assignments FOR UPDATE
  USING (has_role(auth.uid(), 'sme_expert'::app_role));

-- Managers can view assignments for modules in accessible courses
CREATE POLICY "Managers can view assignments in accessible courses"
  ON public.module_assignments FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.module_id = module_assignments.module_id
      AND c.is_published = true
    )
  );

-- Learners can view assignments for modules in assigned courses
CREATE POLICY "Learners can view assignments in assigned courses"
  ON public.module_assignments FOR SELECT
  USING (
    has_role(auth.uid(), 'learner'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.course_assignments ca ON ca.course_id = cm.course_id
      WHERE cm.module_id = module_assignments.module_id
      AND ca.user_id = auth.uid()
    )
  );

-- =====================
-- Migrate existing data from modules table
-- =====================

-- Migrate quiz data
INSERT INTO public.module_quizzes (module_id, module_name, questions, settings, quiz_ai_used, created_at)
SELECT 
  m.id,
  m.title,
  COALESCE(
    m.quiz_data->'questions',
    CASE WHEN jsonb_typeof(m.quiz_data) = 'array' THEN m.quiz_data ELSE '[]'::jsonb END
  ),
  COALESCE(m.quiz_data->'settings', '{}'::jsonb),
  m.quiz_ai_used,
  m.created_at
FROM public.modules m
WHERE m.quiz_data IS NOT NULL 
  AND m.quiz_data != 'null'::jsonb
  AND (
    jsonb_typeof(m.quiz_data) = 'array' 
    OR (jsonb_typeof(m.quiz_data) = 'object' AND m.quiz_data ? 'questions')
  );

-- Migrate assignment data (handling nested structure)
INSERT INTO public.module_assignments (module_id, module_name, title, goal, instructions, expected_output, evaluation_criteria, rubric, order_index, created_at)
SELECT 
  m.id,
  m.title,
  COALESCE(a->>'title', 'Untitled Assignment'),
  a->>'goal',
  a->>'instructions',
  COALESCE(a->>'expectedOutput', a->>'expected_output'),
  COALESCE((a->'evaluationCriteria')::jsonb, (a->'evaluation_criteria')::jsonb, '[]'::jsonb),
  a->'rubric',
  (row_number() OVER (PARTITION BY m.id ORDER BY (a->>'title')))::integer - 1,
  m.created_at
FROM public.modules m,
LATERAL (
  SELECT value as a FROM jsonb_array_elements(
    CASE 
      WHEN m.assignment_data ? 'assignments' THEN m.assignment_data->'assignments'
      WHEN jsonb_typeof(m.assignment_data) = 'array' THEN m.assignment_data
      ELSE '[]'::jsonb
    END
  )
) sub
WHERE m.assignment_data IS NOT NULL 
  AND m.assignment_data != 'null'::jsonb
  AND jsonb_array_length(
    CASE 
      WHEN m.assignment_data ? 'assignments' THEN m.assignment_data->'assignments'
      WHEN jsonb_typeof(m.assignment_data) = 'array' THEN m.assignment_data
      ELSE '[]'::jsonb
    END
  ) > 0;