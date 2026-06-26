-- 1. Drop the old manager_access-based policy on modules
DROP POLICY IF EXISTS "Managers can view accessible modules" ON modules;

-- 2. Create new org-based policy for managers viewing modules
CREATE POLICY "Managers can view modules based on org access"
ON modules
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND approval_status = 'approved' 
  AND is_published = true
  AND (
    -- User has private org access - can see all modules
    EXISTS (
      SELECT 1 FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = auth.uid()
      AND o.access_type = 'private'
    )
    OR
    -- User has public org access - can only see public modules
    (
      visibility = 'public'
      AND EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
      )
    )
  )
);

-- 3. Drop trigger on manager_access (if exists)
DROP TRIGGER IF EXISTS update_manager_access_updated_at ON manager_access;

-- 4. Drop RLS policies on manager_access
DROP POLICY IF EXISTS "Admins can manage all manager access" ON manager_access;
DROP POLICY IF EXISTS "Managers can view their own access" ON manager_access;

-- 5. Drop the manager_access table
DROP TABLE IF EXISTS manager_access;