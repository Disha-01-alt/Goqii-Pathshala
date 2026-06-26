-- Allow learners to view assessments that are linked to courses they are assigned to
CREATE POLICY "Learners can view assessments for assigned courses"
ON public.assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM course_assessments ca
    JOIN course_assignments cas ON ca.course_id = cas.course_id
    WHERE ca.assessment_id = assessments.id 
    AND cas.user_id = auth.uid()
  )
);