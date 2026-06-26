-- Policy: Users with private org access can view all published courses
-- Users with public org access can only view public published courses
CREATE POLICY "Users can view courses based on org access"
ON courses
FOR SELECT
USING (
  is_published = true
  AND (
    -- User has private org access - can see all courses
    EXISTS (
      SELECT 1 FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = auth.uid()
      AND o.access_type = 'private'
    )
    OR
    -- User has public org access - can only see public courses
    (
      visibility = 'public'
      AND EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
      )
    )
  )
);