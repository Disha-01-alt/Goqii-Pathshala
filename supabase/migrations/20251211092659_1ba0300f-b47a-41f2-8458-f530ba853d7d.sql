-- Allow learners to view modules in courses at their assigned level
CREATE POLICY "Learners can view modules in their level courses"
ON public.course_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN learner_levels ll ON ll.level_id = c.level_id
    WHERE c.id = course_modules.course_id
    AND ll.user_id = auth.uid()
  )
);

-- Allow learners to view module content that is part of courses at their level
CREATE POLICY "Learners can view modules in their level courses"
ON public.modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    JOIN learner_levels ll ON ll.level_id = c.level_id
    WHERE cm.module_id = modules.id
    AND ll.user_id = auth.uid()
  )
);