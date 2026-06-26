-- Allow managers to INSERT assessments to courses
CREATE POLICY "Managers can add course assessments"
ON public.course_assessments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
);

-- Allow managers to UPDATE course assessments
CREATE POLICY "Managers can update course assessments"
ON public.course_assessments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to DELETE/remove course assessments  
CREATE POLICY "Managers can remove course assessments"
ON public.course_assessments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));