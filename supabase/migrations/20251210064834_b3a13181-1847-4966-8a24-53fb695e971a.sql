-- Create storage bucket for uploaded module files
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-files', 'module-files', true);

-- Add file_url column to modules table for uploaded files
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS file_url text;

-- Storage policies for module-files bucket
CREATE POLICY "Users can upload their own module files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'module-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own module files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'module-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own module files"
ON storage.objects FOR DELETE
USING (bucket_id = 'module-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Module files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'module-files');