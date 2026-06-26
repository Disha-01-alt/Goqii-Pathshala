-- Allow Admins to delete any course
CREATE POLICY "Admins can delete any course"
ON public.courses
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow Admins to delete any module
CREATE POLICY "Admins can delete any module"
ON public.modules
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));