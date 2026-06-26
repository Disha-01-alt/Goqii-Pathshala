-- Add sme_expert to the app_role enum (must be committed separately before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sme_expert';