-- Create AI usage log table for tracking API calls
CREATE TABLE public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  ai_type TEXT NOT NULL DEFAULT 'content', -- 'content' or 'quiz'
  operation TEXT, -- 'generate_module', 'generate_quiz', 'regenerate_image', etc.
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10, 6) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create custom AI providers table
CREATE TABLE public.custom_ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  provider_key TEXT NOT NULL, -- unique identifier like 'my-openai'
  api_endpoint TEXT NOT NULL,
  api_key_header TEXT DEFAULT 'Authorization',
  api_key_prefix TEXT DEFAULT 'Bearer ',
  ai_type TEXT NOT NULL DEFAULT 'both', -- 'content', 'quiz', or 'both'
  models JSONB DEFAULT '[]', -- array of model names
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider_key)
);

-- Enable RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_ai_providers ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_usage_log
CREATE POLICY "Users can view their own usage logs"
ON public.ai_usage_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs"
ON public.ai_usage_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage logs"
ON public.ai_usage_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for custom_ai_providers
CREATE POLICY "Users can view their own custom providers"
ON public.custom_ai_providers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom providers"
ON public.custom_ai_providers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom providers"
ON public.custom_ai_providers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom providers"
ON public.custom_ai_providers
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all custom providers"
ON public.custom_ai_providers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_log_created_at ON public.ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_log_provider ON public.ai_usage_log(provider);
CREATE INDEX idx_ai_usage_log_ai_type ON public.ai_usage_log(ai_type);
CREATE INDEX idx_custom_ai_providers_user_id ON public.custom_ai_providers(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_ai_providers_updated_at
BEFORE UPDATE ON public.custom_ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();