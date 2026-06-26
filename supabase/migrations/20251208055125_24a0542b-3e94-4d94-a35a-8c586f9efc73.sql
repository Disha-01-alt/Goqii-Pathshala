-- Add columns for separate text and image AI settings
ALTER TABLE public.user_ai_settings 
ADD COLUMN text_ai_mode text NOT NULL DEFAULT 'lovable',
ADD COLUMN text_provider text DEFAULT 'openai',
ADD COLUMN image_ai_mode text NOT NULL DEFAULT 'lovable',
ADD COLUMN image_provider text DEFAULT 'openai';

-- Migrate existing data: copy current settings to image settings (since current settings were for images)
UPDATE public.user_ai_settings 
SET image_ai_mode = ai_mode,
    image_provider = provider;

-- Add comments for clarity
COMMENT ON COLUMN public.user_ai_settings.text_ai_mode IS 'AI mode for module content generation: lovable or own';
COMMENT ON COLUMN public.user_ai_settings.text_provider IS 'Provider for text generation when using own account';
COMMENT ON COLUMN public.user_ai_settings.image_ai_mode IS 'AI mode for image generation: lovable or own';
COMMENT ON COLUMN public.user_ai_settings.image_provider IS 'Provider for image generation when using own account';