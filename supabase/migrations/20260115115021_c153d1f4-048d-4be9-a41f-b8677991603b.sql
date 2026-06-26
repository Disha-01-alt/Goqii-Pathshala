-- Drop the existing constraint and recreate with the new module type
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS valid_module_type;

ALTER TABLE public.modules ADD CONSTRAINT valid_module_type 
CHECK (module_type = ANY (ARRAY['document', 'presentation', 'interactive_html', 'elearning', 'textbook', 'video', 'quiz', 'explain_video', 'ppt', 'pdf']));