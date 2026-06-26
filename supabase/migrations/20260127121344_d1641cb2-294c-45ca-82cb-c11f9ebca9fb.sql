-- Allow SME Experts to view all published courses
CREATE POLICY "SME Expert can view published courses"
ON public.courses
FOR SELECT
USING (has_role(auth.uid(), 'sme_expert'::app_role) AND is_published = true);

-- Allow SME Experts to view course modules for published courses
CREATE POLICY "SME Expert can view course modules"
ON public.course_modules
FOR SELECT
USING (has_role(auth.uid(), 'sme_expert'::app_role) AND EXISTS (
  SELECT 1 FROM courses c 
  WHERE c.id = course_modules.course_id 
  AND c.is_published = true
));

-- Allow SME Experts to add modules to published courses
CREATE POLICY "SME Expert can add modules to courses"
ON public.course_modules
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'sme_expert'::app_role) AND EXISTS (
  SELECT 1 FROM courses c 
  WHERE c.id = course_modules.course_id 
  AND c.is_published = true
));