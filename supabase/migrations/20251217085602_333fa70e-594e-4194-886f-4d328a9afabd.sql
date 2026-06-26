-- Update system_ai_settings table structure for unified settings
-- First drop old columns if they exist and add new unified structure

-- Drop the text/image separation columns
ALTER TABLE public.system_ai_settings
DROP COLUMN IF EXISTS text_ai_mode,
DROP COLUMN IF EXISTS text_provider,
DROP COLUMN IF EXISTS image_ai_mode,
DROP COLUMN IF EXISTS image_provider;

-- Add unified columns
ALTER TABLE public.system_ai_settings
ADD COLUMN IF NOT EXISTS ai_mode TEXT NOT NULL DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'google',
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT NULL;

-- Also update user_ai_settings to have unified structure for any legacy data
ALTER TABLE public.user_ai_settings
DROP COLUMN IF EXISTS text_ai_mode,
DROP COLUMN IF EXISTS text_provider,
DROP COLUMN IF EXISTS image_ai_mode,
DROP COLUMN IF EXISTS image_provider;

-- Ensure user_ai_settings also has unified columns
ALTER TABLE public.user_ai_settings
ADD COLUMN IF NOT EXISTS ai_mode_unified TEXT DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS provider_unified TEXT DEFAULT 'google',
ADD COLUMN IF NOT EXISTS model_unified TEXT DEFAULT NULL;