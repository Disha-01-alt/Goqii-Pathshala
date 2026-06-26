-- Add Quiz AI columns to system_ai_settings
ALTER TABLE public.system_ai_settings 
ADD COLUMN IF NOT EXISTS quiz_ai_mode TEXT NOT NULL DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS quiz_ai_provider TEXT DEFAULT 'mistral',
ADD COLUMN IF NOT EXISTS quiz_ai_model TEXT DEFAULT NULL;

-- Add content summary and AI tracking to modules
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS content_ai_used TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quiz_ai_used TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS content_summary JSONB DEFAULT NULL;