-- Allow learners to view assessments for courses assigned to them
CREATE POLICY "Learners can view assessments for assigned courses"
ON public.course_assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM course_assignments ca
    WHERE ca.course_id = course_assessments.course_id
    AND ca.user_id = auth.uid()
  )
);