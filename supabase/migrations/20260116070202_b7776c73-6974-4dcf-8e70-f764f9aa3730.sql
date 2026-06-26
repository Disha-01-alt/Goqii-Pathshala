-- Remove the trigger that auto-assigns learner role
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

-- Remove the function
DROP FUNCTION IF EXISTS public.auto_assign_learner_role();

-- Clean up duplicate roles: remove learner role from users who have another role
DELETE FROM user_roles 
WHERE role = 'learner' 
AND user_id IN (
  SELECT user_id 
  FROM user_roles 
  GROUP BY user_id 
  HAVING COUNT(*) > 1
);