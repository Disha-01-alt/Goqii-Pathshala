import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LearnerProgressData {
  learner: {
    id: string;
    full_name: string | null;
    email: string;
  };
  courses: {
    course_id: string;
    course_title: string;
    module_scores: Record<string, { score: number; completed: boolean }>;
    overall_score: number | null;
    is_completed: boolean;
    started_at: string;
    completed_at: string | null;
  }[];
  assessments: {
    assessment_id: string;
    assessment_title: string;
    course_id: string;
    course_title: string;
    status: string;
    score: number | null;
    max_score: number;
    submitted_at: string | null;
    graded_at: string | null;
  }[];
}

export function useLearnerProgress() {
  const { data: learnersProgress, isLoading } = useQuery({
    queryKey: ["learner-progress"],
    queryFn: async () => {
      // Get all learners
      const { data: learners, error: learnersError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email
        `)
        .in("id", 
          (await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "learner")
          ).data?.map(r => r.user_id) || []
        );

      if (learnersError) throw learnersError;

      // Get course progress
      const { data: courseProgress } = await supabase
        .from("course_progress")
        .select(`
          user_id,
          course_id,
          module_scores,
          overall_score,
          is_completed,
          started_at,
          completed_at,
          course:courses(id, title)
        `);

      // Get assessment submissions
      const { data: submissions } = await supabase
        .from("assessment_submissions")
        .select(`
          user_id,
          assessment_id,
          course_id,
          status,
          score,
          max_score,
          submitted_at,
          graded_at,
          assessment:assessments(id, title),
          course:courses(id, title)
        `);

      // Build combined data
      const progressData: LearnerProgressData[] = (learners || []).map((learner) => {
        const courses = (courseProgress || [])
          .filter((cp: any) => cp.user_id === learner.id)
          .map((cp: any) => ({
            course_id: cp.course_id,
            course_title: cp.course?.title || "Unknown",
            module_scores: cp.module_scores as Record<string, { score: number; completed: boolean }>,
            overall_score: cp.overall_score,
            is_completed: cp.is_completed,
            started_at: cp.started_at,
            completed_at: cp.completed_at,
          }));

        const assessments = (submissions || [])
          .filter((s: any) => s.user_id === learner.id)
          .map((s: any) => ({
            assessment_id: s.assessment_id,
            assessment_title: s.assessment?.title || "Unknown",
            course_id: s.course_id,
            course_title: s.course?.title || "Unknown",
            status: s.status,
            score: s.score,
            max_score: s.max_score,
            submitted_at: s.submitted_at,
            graded_at: s.graded_at,
          }));

        return {
          learner: {
            id: learner.id,
            full_name: learner.full_name,
            email: learner.email,
          },
          courses,
          assessments,
        };
      });

      return progressData;
    },
  });

  return {
    learnersProgress,
    isLoading,
  };
}
