-- Create organization_course_settings table for per-org module/assignment customization
CREATE TABLE public.organization_course_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  is_module_enabled boolean DEFAULT true,
  disabled_assignment_indices integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, course_id, module_id)
);

-- Enable RLS
ALTER TABLE public.organization_course_settings ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage all org course settings"
ON public.organization_course_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view their org settings
CREATE POLICY "Managers can view their org course settings"
ON public.organization_course_settings FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) AND user_has_organization(auth.uid(), organization_id));

-- Managers can insert their org settings
CREATE POLICY "Managers can insert their org course settings"
ON public.organization_course_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND user_has_organization(auth.uid(), organization_id));

-- Managers can update their org settings
CREATE POLICY "Managers can update their org course settings"
ON public.organization_course_settings FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) AND user_has_organization(auth.uid(), organization_id));

-- Managers can delete their org settings
CREATE POLICY "Managers can delete their org course settings"
ON public.organization_course_settings FOR DELETE
USING (has_role(auth.uid(), 'manager'::app_role) AND user_has_organization(auth.uid(), organization_id));

-- Add index for faster lookups
CREATE INDEX idx_org_course_settings_lookup 
ON public.organization_course_settings(organization_id, course_id);