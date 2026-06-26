-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  passing_score INTEGER NOT NULL DEFAULT 70,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_modules junction table
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_id)
);

-- Create course_progress table
CREATE TABLE public.course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Courses RLS policies
CREATE POLICY "Users can view their own courses"
ON public.courses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses"
ON public.courses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
ON public.courses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
ON public.courses FOR DELETE
USING (auth.uid() = user_id);

-- Course modules RLS policies
CREATE POLICY "Users can view modules in their courses"
ON public.course_modules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.courses
  WHERE courses.id = course_modules.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can add modules to their courses"
ON public.course_modules FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses
  WHERE courses.id = course_modules.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can update modules in their courses"
ON public.course_modules FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.courses
  WHERE courses.id = course_modules.course_id
  AND courses.user_id = auth.uid()
));

CREATE POLICY "Users can remove modules from their courses"
ON public.course_modules FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.courses
  WHERE courses.id = course_modules.course_id
  AND courses.user_id = auth.uid()
));

-- Course progress RLS policies
CREATE POLICY "Users can view their own progress"
ON public.course_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
ON public.course_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.course_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
ON public.course_progress FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();