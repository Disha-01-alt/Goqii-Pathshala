
-- Drop policies that allow learners to see courses without assignment
DROP POLICY IF EXISTS "Learners can view courses at their level" ON public.courses;

-- Update the org access policy to exclude learners (they should only see assigned courses)
DROP POLICY IF EXISTS "Users can view courses based on org access" ON public.courses;

-- Recreate org access policy for managers only (learners use assignment-based access)
CREATE POLICY "Managers can view courses based on org access"
ON public.courses
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) AND
  is_published = true AND
  (
    (visibility = 'private' AND EXISTS (
      SELECT 1 FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = auth.uid() AND o.access_type = 'private'
    ))
    OR
    (visibility = 'public' AND EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
    ))
  )
);
