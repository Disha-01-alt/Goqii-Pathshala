-- Drop the existing constraint and add an updated one with more module types
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS valid_module_type;

ALTER TABLE public.modules ADD CONSTRAINT valid_module_type 
  CHECK (module_type IN ('document', 'presentation', 'interactive_html', 'elearning', 'textbook', 'video', 'quiz'));