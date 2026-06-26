-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create modules table
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slides JSONB NOT NULL,
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Modules RLS policies
CREATE POLICY "Users can view their own modules"
  ON public.modules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own modules"
  ON public.modules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modules"
  ON public.modules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modules"
  ON public.modules FOR DELETE
  USING (auth.uid() = user_id);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags RLS policies
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- Create module_tags junction table
CREATE TABLE public.module_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(module_id, tag_id)
);

-- Enable RLS on module_tags
ALTER TABLE public.module_tags ENABLE ROW LEVEL SECURITY;

-- Module tags RLS policies
CREATE POLICY "Users can view tags for their own modules"
  ON public.module_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = module_tags.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add tags to their own modules"
  ON public.module_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = module_tags.module_id
      AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove tags from their own modules"
  ON public.module_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = module_tags.module_id
      AND modules.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_modules_user_id ON public.modules(user_id);
CREATE INDEX idx_modules_created_at ON public.modules(created_at DESC);
CREATE INDEX idx_modules_is_favorite ON public.modules(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_module_tags_module_id ON public.module_tags(module_id);
CREATE INDEX idx_module_tags_tag_id ON public.module_tags(tag_id);

-- Create trigger for updating updated_at on modules
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();