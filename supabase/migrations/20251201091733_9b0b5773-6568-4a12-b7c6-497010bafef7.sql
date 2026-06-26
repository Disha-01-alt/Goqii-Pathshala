-- Add module_type column to modules table
ALTER TABLE public.modules ADD COLUMN module_type TEXT NOT NULL DEFAULT 'presentation';

-- Add check constraint for valid module types
ALTER TABLE public.modules ADD CONSTRAINT valid_module_type CHECK (module_type IN ('document', 'presentation', 'interactive_html', 'elearning'));