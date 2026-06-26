-- module_outputs: per-module generated outputs (slide_images, video, ...).
-- This table existed on the original Lovable DB but was never captured in the
-- migration set, so a fresh project must create it. The video pipeline
-- (convert-ppt-to-video / generate-video-pipeline) reads & upserts it with
-- onConflict (module_id, format_type).
create table if not exists public.module_outputs (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  format_type text not null,
  content jsonb not null default '{}'::jsonb,
  status text,
  video_url text,
  provider_name text,
  preferences jsonb,
  created_at timestamptz not null default now(),
  unique (module_id, format_type)
);

create index if not exists module_outputs_module_id_idx on public.module_outputs(module_id);

alter table public.module_outputs enable row level security;

-- Edge functions use the service role (bypasses RLS). Client-side reads need
-- authenticated SELECT (the module viewer fetches the completed video URL).
drop policy if exists "module_outputs_select_authenticated" on public.module_outputs;
create policy "module_outputs_select_authenticated" on public.module_outputs
  for select to authenticated using (true);

drop policy if exists "module_outputs_write_authenticated" on public.module_outputs;
create policy "module_outputs_write_authenticated" on public.module_outputs
  for all to authenticated using (true) with check (true);
