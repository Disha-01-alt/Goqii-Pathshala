
-- Drop policies that reference learner_levels
DROP POLICY IF EXISTS "Learners can view modules in their level courses" ON public.course_modules;
DROP POLICY IF EXISTS "Learners can view modules in their level courses" ON public.modules;
DROP POLICY IF EXISTS "Learners can view assessments in their courses" ON public.assessments;
DROP POLICY IF EXISTS "Learners can view course assessments in their level" ON public.course_assessments;
DROP POLICY IF EXISTS "Managers can view learner_levels in their organization" ON public.learner_levels;
DROP POLICY IF EXISTS "Managers can manage learner_levels in their organization" ON public.learner_levels;

-- Drop the learner_levels table entirely
DROP TABLE IF EXISTS public.learner_levels;
