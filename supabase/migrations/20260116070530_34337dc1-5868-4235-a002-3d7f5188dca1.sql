-- Create a smarter auto-assign function that checks if role already exists
CREATE OR REPLACE FUNCTION public.auto_assign_learner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign learner role if no role exists for this user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'learner');
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on profile creation
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_learner_role();