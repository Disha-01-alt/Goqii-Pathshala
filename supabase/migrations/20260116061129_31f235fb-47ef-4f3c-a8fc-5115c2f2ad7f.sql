
-- Add policy for managers to view course_modules based on organization access
CREATE POLICY "Managers can view course modules based on org access"
ON public.course_modules
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) AND
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_modules.course_id
    AND c.is_published = true
    AND (
      -- Private org access: managers can see private courses
      (c.visibility = 'private' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND o.access_type = 'private'
      ))
      OR
      -- Public courses visible to all managers in an org
      (c.visibility = 'public' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
      ))
    )
  )
);

-- Also update learner policy to also consider organization access, not just level
CREATE POLICY "Learners can view course modules via organization"
ON public.course_modules
FOR SELECT
USING (
  has_role(auth.uid(), 'learner'::app_role) AND
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_modules.course_id
    AND c.is_published = true
    AND (
      -- Private org access
      (c.visibility = 'private' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND o.access_type = 'private'
      ))
      OR
      -- Public courses visible via org membership
      (c.visibility = 'public' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
      ))
    )
  )
);

-- Update modules table to let managers see modules that are part of courses they can access
CREATE POLICY "Managers can view modules in accessible courses"
ON public.modules
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.module_id = modules.id
    AND c.is_published = true
    AND (
      (c.visibility = 'private' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND o.access_type = 'private'
      ))
      OR
      (c.visibility = 'public' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
      ))
    )
  )
);

-- Update learner modules policy to also work via org access
CREATE POLICY "Learners can view modules via organization courses"
ON public.modules
FOR SELECT
USING (
  has_role(auth.uid(), 'learner'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.module_id = modules.id
    AND c.is_published = true
    AND (
      (c.visibility = 'private' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND o.access_type = 'private'
      ))
      OR
      (c.visibility = 'public' AND EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
      ))
    )
  )
);
