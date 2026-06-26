
-- Create module_slide_audio table
CREATE TABLE public.module_slide_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  slide_number INTEGER NOT NULL,
  narration_text TEXT NOT NULL,
  audio_url TEXT,
  audio_duration INTEGER,
  audio_status TEXT NOT NULL DEFAULT 'pending',
  voice_id TEXT DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, slide_number)
);

-- Enable RLS
ALTER TABLE public.module_slide_audio ENABLE ROW LEVEL SECURITY;

-- SMEs can manage audio for their own modules
CREATE POLICY "SMEs can manage audio for own modules"
ON public.module_slide_audio
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = module_slide_audio.module_id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = module_slide_audio.module_id AND m.user_id = auth.uid()
  )
);

-- Admins have full access
CREATE POLICY "Admins can manage all slide audio"
ON public.module_slide_audio
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SME Experts can view all slide audio
CREATE POLICY "SME Experts can view all slide audio"
ON public.module_slide_audio
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sme_expert'::app_role));

-- Learners can read audio for modules in assigned courses
CREATE POLICY "Learners can read slide audio for assigned courses"
ON public.module_slide_audio
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'learner'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN course_assignments ca ON ca.course_id = cm.course_id
    WHERE cm.module_id = module_slide_audio.module_id AND ca.user_id = auth.uid()
  )
);

-- Managers can view slide audio for accessible modules
CREATE POLICY "Managers can view slide audio"
ON public.module_slide_audio
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) AND
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.module_id = module_slide_audio.module_id AND c.is_published = true
  )
);

-- Updated_at trigger
CREATE TRIGGER update_module_slide_audio_updated_at
  BEFORE UPDATE ON public.module_slide_audio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
