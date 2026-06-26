-- Add visibility column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

-- Add constraint to ensure valid values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courses_visibility_check'
    ) THEN
        ALTER TABLE public.courses ADD CONSTRAINT courses_visibility_check 
        CHECK (visibility IN ('public', 'private'));
    END IF;
END $$;