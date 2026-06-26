
-- Fix 1: Drop old overly permissive policy and any existing replacement
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Managers and admins can create notifications" ON public.notifications;

CREATE POLICY "Managers and admins can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Enable RLS on system_ai_settings and fix policies
ALTER TABLE public.system_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_ai_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_ai_settings;
DROP POLICY IF EXISTS "All users can read system settings" ON public.system_ai_settings;
DROP POLICY IF EXISTS "All authenticated users can read system settings" ON public.system_ai_settings;

CREATE POLICY "All authenticated users can read system settings"
ON public.system_ai_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert system settings"
ON public.system_ai_settings FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update system settings"
ON public.system_ai_settings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
