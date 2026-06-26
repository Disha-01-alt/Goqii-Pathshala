-- Add approval workflow columns to modules table
ALTER TABLE public.modules 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add constraint for approval_status values
ALTER TABLE public.modules 
  DROP CONSTRAINT IF EXISTS valid_approval_status;
  
ALTER TABLE public.modules 
  ADD CONSTRAINT valid_approval_status 
  CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected'));

-- Create index for faster approval status queries
CREATE INDEX IF NOT EXISTS idx_modules_approval_status ON public.modules(approval_status);

-- SME Expert can view all modules (for review purposes)
DROP POLICY IF EXISTS "SME Expert can view all modules" ON public.modules;
CREATE POLICY "SME Expert can view all modules"
ON public.modules
FOR SELECT
USING (has_role(auth.uid(), 'sme_expert'));

-- SME Expert can update approval status on modules
DROP POLICY IF EXISTS "SME Expert can update module approval" ON public.modules;
CREATE POLICY "SME Expert can update module approval"
ON public.modules
FOR UPDATE
USING (has_role(auth.uid(), 'sme_expert'));

-- Update managers policy to only see approved and published modules
DROP POLICY IF EXISTS "Managers can view accessible modules" ON public.modules;
CREATE POLICY "Managers can view accessible modules"
ON public.modules
FOR SELECT
USING (
  has_role(auth.uid(), 'manager') 
  AND approval_status = 'approved'
  AND is_published = true
  AND (
    (visibility = 'public' AND EXISTS (
      SELECT 1 FROM manager_access 
      WHERE user_id = auth.uid() AND can_access_public = true
    ))
    OR
    (visibility = 'private' AND EXISTS (
      SELECT 1 FROM manager_access 
      WHERE user_id = auth.uid() AND can_access_private = true
    ))
  )
);