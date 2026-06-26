-- Add new columns for Module Forge workflow
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS forge_status TEXT DEFAULT 'draft_input';
-- Values: draft_input, prompt_approved, content_generated, formatted, submitted_to_sme

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS forge_inputs JSONB;
-- Structure: { topic, description, scope, depth, imagesRequired, style }

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS approved_prompt TEXT;
-- The master prompt approved by designer

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS raw_content TEXT;
-- The generated module content (editable)

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS formatted_output JSONB;
-- Structure: { type: 'ppt'|'article'|'document'|'video', content: {...}, preferences: {...} }

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS quiz_data JSONB;
-- Structure: { questions: [...], settings: { numberOfQuestions, difficulty, types } }

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS assignment_data JSONB;
-- Structure: { assignments: [...], settings: { numberOfAssignments, type, rubricRequired } }

-- Add index for forge_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_modules_forge_status ON public.modules(forge_status);