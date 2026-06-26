
CREATE TABLE public.video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  scene_total INTEGER NOT NULL DEFAULT 0,
  scene_completed INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  output_video_url TEXT,
  error_message TEXT,
  shotstack_render_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Module owners can view their video jobs"
ON public.video_generation_jobs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = video_generation_jobs.module_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Module owners can insert video jobs"
ON public.video_generation_jobs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = video_generation_jobs.module_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Module owners can update their video jobs"
ON public.video_generation_jobs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = video_generation_jobs.module_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all video jobs"
ON public.video_generation_jobs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
