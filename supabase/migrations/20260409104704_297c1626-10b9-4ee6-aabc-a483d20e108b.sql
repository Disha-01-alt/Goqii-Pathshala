ALTER TABLE public.system_ai_settings
ADD COLUMN IF NOT EXISTS narration_ai_mode TEXT NOT NULL DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS narration_ai_provider TEXT DEFAULT 'elevenlabs',
ADD COLUMN IF NOT EXISTS narration_ai_model TEXT DEFAULT NULL;