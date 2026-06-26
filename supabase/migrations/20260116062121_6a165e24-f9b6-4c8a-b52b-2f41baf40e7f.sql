
-- Drop existing learner policies that allow broader access
DROP POLICY IF EXISTS "Learners can view course modules via organization" ON public.course_modules;
DROP POLICY IF EXISTS "Learners can view modules via organization courses" ON public.modules;
DROP POLICY IF EXISTS "Learners can view published courses for their level" ON public.courses;

-- Create new policy: Learners can only view courses assigned to them
CREATE POLICY "Learners can view assigned courses only"
ON public.courses
FOR SELECT
USING (
  has_role(auth.uid(), 'learner'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_assignments ca
    WHERE ca.course_id = courses.id
    AND ca.user_id = auth.uid()
  )
);

-- Create new policy: Learners can only view course_modules from assigned courses
CREATE POLICY "Learners can view modules from assigned courses"
ON public.course_modules
FOR SELECT
USING (
  has_role(auth.uid(), 'learner'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_assignments ca
    WHERE ca.course_id = course_modules.course_id
    AND ca.user_id = auth.uid()
  )
);

-- Create new policy: Learners can only view modules that belong to assigned courses
CREATE POLICY "Learners can view modules in assigned courses"
ON public.modules
FOR SELECT
USING (
  has_role(auth.uid(), 'learner'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN course_assignments ca ON ca.course_id = cm.course_id
    WHERE cm.module_id = modules.id
    AND ca.user_id = auth.uid()
  )
);
