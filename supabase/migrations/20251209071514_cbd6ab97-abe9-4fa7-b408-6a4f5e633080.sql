-- Create role enum
CREATE TYPE public.app_role AS ENUM ('learner', 'manager', 'sme', 'admin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'learner',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'sme' THEN 3 
      WHEN 'learner' THEN 4 
    END
  LIMIT 1
$$;

-- Levels table (managed by Admins)
CREATE TABLE public.levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on levels
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Learner level assignments
CREATE TABLE public.learner_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level_id uuid REFERENCES public.levels(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on learner_levels
ALTER TABLE public.learner_levels ENABLE ROW LEVEL SECURITY;

-- Add level_id to courses
ALTER TABLE public.courses ADD COLUMN level_id uuid REFERENCES public.levels(id);

-- Add is_active to profiles
ALTER TABLE public.profiles ADD COLUMN is_active boolean DEFAULT true;

-- Add module publishing columns
ALTER TABLE public.modules ADD COLUMN is_published boolean DEFAULT false;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view learner roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager') AND role = 'learner');

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert learner roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager') AND role = 'learner');

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for levels
CREATE POLICY "Everyone can view levels"
ON public.levels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage levels"
ON public.levels FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for learner_levels
CREATE POLICY "Users can view their own level"
ON public.learner_levels FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all learner levels"
ON public.learner_levels FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view learner levels"
ON public.learner_levels FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can manage learner levels"
ON public.learner_levels FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can assign learner levels"
ON public.learner_levels FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update learner levels"
ON public.learner_levels FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Update profiles RLS to allow admins/managers to view learners
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view learner profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'learner'
  )
);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update courses RLS to allow learners to view courses at their level
CREATE POLICY "Learners can view courses at their level"
ON public.courses FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'learner')
  AND (
    level_id IS NULL 
    OR level_id IN (
      SELECT level_id FROM public.learner_levels WHERE user_id = auth.uid()
    )
  )
);

-- Insert default levels
INSERT INTO public.levels (name, display_name, order_index, description) VALUES
('L1', 'Level 1 - Beginner', 1, 'Entry level for new learners'),
('L2', 'Level 2 - Intermediate', 2, 'For learners with basic understanding'),
('L3', 'Level 3 - Professional', 3, 'Advanced level for experienced learners');