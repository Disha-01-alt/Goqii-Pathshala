-- Create explain_mode_content table for storing audio-visual explanation scenes
CREATE TABLE public.explain_mode_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  scenes JSONB NOT NULL DEFAULT '[]',
  total_duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.explain_mode_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view explain content for their modules"
  ON public.explain_mode_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m 
      WHERE m.id = module_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view approved explain content"
  ON public.explain_mode_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m 
      WHERE m.id = module_id 
      AND m.approval_status = 'approved'
    )
  );

CREATE POLICY "Users can insert explain content for their modules"
  ON public.explain_mode_content FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules m 
      WHERE m.id = module_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update explain content for their modules"
  ON public.explain_mode_content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m 
      WHERE m.id = module_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete explain content for their modules"
  ON public.explain_mode_content FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m 
      WHERE m.id = module_id 
      AND m.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_explain_mode_content_updated_at
  BEFORE UPDATE ON public.explain_mode_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_explain_mode_content_module_id ON public.explain_mode_content(module_id);