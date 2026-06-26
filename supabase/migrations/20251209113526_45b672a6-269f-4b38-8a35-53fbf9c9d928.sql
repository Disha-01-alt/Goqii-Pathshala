-- Add visibility column to modules table
ALTER TABLE public.modules ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private'));

-- Create manager_access table to control which modules managers can see
CREATE TABLE public.manager_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  can_access_public BOOLEAN NOT NULL DEFAULT false,
  can_access_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on manager_access
ALTER TABLE public.manager_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for manager_access table
CREATE POLICY "Admins can manage all manager access" ON public.manager_access
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view their own access" ON public.manager_access
FOR SELECT USING (user_id = auth.uid());

-- Drop existing module policies and recreate with visibility logic
DROP POLICY IF EXISTS "Users can view their own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can insert their own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can update their own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can delete their own modules" ON public.modules;

-- SMEs can view ALL modules (for reviewing/managing content)
CREATE POLICY "SMEs can view all modules" ON public.modules
FOR SELECT USING (has_role(auth.uid(), 'sme'::app_role));

-- Admins can view ALL modules
CREATE POLICY "Admins can view all modules" ON public.modules
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own modules (module creators)
CREATE POLICY "Users can view own modules" ON public.modules
FOR SELECT USING (auth.uid() = user_id);

-- Managers can view modules based on their access settings
CREATE POLICY "Managers can view accessible modules" ON public.modules
FOR SELECT USING (
  has_role(auth.uid(), 'manager'::app_role) AND (
    (visibility = 'public' AND EXISTS (
      SELECT 1 FROM public.manager_access 
      WHERE user_id = auth.uid() AND can_access_public = true
    )) OR
    (visibility = 'private' AND EXISTS (
      SELECT 1 FROM public.manager_access 
      WHERE user_id = auth.uid() AND can_access_private = true
    ))
  )
);

-- Users can insert their own modules
CREATE POLICY "Users can insert own modules" ON public.modules
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own modules
CREATE POLICY "Users can update own modules" ON public.modules
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own modules
CREATE POLICY "Users can delete own modules" ON public.modules
FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at on manager_access
CREATE TRIGGER update_manager_access_updated_at
BEFORE UPDATE ON public.manager_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();