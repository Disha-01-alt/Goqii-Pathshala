import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";

export type SubmissionStatus = "not_submitted" | "submitted" | "graded" | "needs_revision";

export interface SubmittedFile {
  name: string;
  url: string;
}

export interface AssessmentSubmission {
  id: string;
  assessment_id: string;
  course_id: string;
  user_id: string;
  status: SubmissionStatus;
  submitted_files: SubmittedFile[];
  response_text: string | null;
  score: number | null;
  max_score: number;
  manager_comments: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  assessment?: {
    id: string;
    title: string;
    description: string | null;
    max_score: number;
  };
  course?: {
    id: string;
    title: string;
  };
}

// For learners - get pending assessments from assigned courses
export function usePendingAssessments() {
  const { data: pendingAssessments, isLoading } = useQuery({
    queryKey: ["pending-assessments"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      // Get learner's assigned courses
      const { data: assignments } = await supabase
        .from("course_assignments")
        .select("course_id")
        .eq("user_id", userData.user.id);

      if (!assignments || assignments.length === 0) return [];

      const assignedCourseIds = assignments.map(a => a.course_id);

      // Get assessments from assigned courses
      const { data: courseAssessments, error } = await supabase
        .from("course_assessments")
        .select(`
          id,
          course_id,
          assessment_id,
          due_date,
          course:courses(id, title),
          assessment:assessments(id, title, description, max_score)
        `)
        .in("course_id", assignedCourseIds);

      if (error) throw error;

      // Get existing submissions for this user
      const { data: existingSubmissions } = await supabase
        .from("assessment_submissions")
        .select("assessment_id, course_id, status, score, manager_comments, submitted_files")
        .eq("user_id", userData.user.id);

      // Map and filter to show pending assessments
      const mapped = (courseAssessments || []).map((ca: any) => {
        const submission = existingSubmissions?.find(
          (s) => s.assessment_id === ca.assessment_id && s.course_id === ca.course_id
        );
        
        return {
          id: ca.id,
          assessmentId: ca.assessment_id,
          courseId: ca.course_id,
          courseName: ca.course?.title || "Course",
          title: ca.assessment?.title || "Assessment",
          description: ca.assessment?.description || null,
          maxScore: ca.assessment?.max_score || 100,
          dueDate: ca.due_date,
          status: (submission?.status || "not_submitted") as SubmissionStatus,
          score: submission?.score || null,
          managerComments: submission?.manager_comments || null,
          submittedFiles: (Array.isArray(submission?.submitted_files) ? submission.submitted_files : []) as unknown as SubmittedFile[],
        };
      });

      return mapped;
    },
  });

  return { pendingAssessments, isLoading };
}

// For learners - their own submissions
export function useMySubmissions(courseId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addXPAsync, updateStreak } = useGamification();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["my-submissions", courseId],
    queryFn: async () => {
      let query = supabase
        .from("assessment_submissions")
        .select(`
          *,
          assessment:assessments(id, title, description, max_score),
          course:courses(id, title)
        `)
        .order("created_at", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map((s: any) => ({
        ...s,
        submitted_files: (s.submitted_files || []) as SubmittedFile[],
      })) as AssessmentSubmission[];
    },
  });

  const submitAssessment = useMutation({
    mutationFn: async ({
      assessmentId,
      courseId,
      dueDate,
      responseText,
      files,
    }: {
      assessmentId: string;
      courseId: string;
      dueDate?: string | null;
      responseText?: string;
      files?: SubmittedFile[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Check if submission exists
      const { data: existing } = await supabase
        .from("assessment_submissions")
        .select("id")
        .eq("assessment_id", assessmentId)
        .eq("course_id", courseId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (existing) {
        // Update existing - not a new submission, no XP
        const { data, error } = await supabase
          .from("assessment_submissions")
          .update({
            response_text: responseText,
            submitted_files: JSON.parse(JSON.stringify(files || [])),
            status: "submitted" as const,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return { data, isOnTime: false, isNewSubmission: false };
      } else {
        // Create new
        const { data: assessment } = await supabase
          .from("assessments")
          .select("max_score")
          .eq("id", assessmentId)
          .single();

        const { data, error } = await supabase
          .from("assessment_submissions")
          .insert([{
            assessment_id: assessmentId,
            course_id: courseId,
            user_id: userData.user.id,
            response_text: responseText,
            submitted_files: JSON.parse(JSON.stringify(files || [])),
            status: "submitted" as const,
            submitted_at: new Date().toISOString(),
            max_score: assessment?.max_score || 100,
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Check if submitted on time for XP bonus
        const isOnTime = dueDate ? new Date() <= new Date(dueDate) : true;
        return { data, isOnTime, isNewSubmission: true };
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-assessments"] });
      toast({ title: "Assessment submitted successfully" });
      
      // Award XP for on-time submission (+15 XP)
      if (result?.isNewSubmission && result?.isOnTime) {
        try {
          await addXPAsync({ amount: 15, reason: "Assignment submitted on time!" });
          updateStreak();
        } catch (e) {
          console.error("Failed to award submission XP:", e);
        }
      }
    },
    onError: (error) => {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    },
  });

  return {
    submissions,
    isLoading,
    submitAssessment,
  };
}

// For managers - all submissions they need to review
export function useAllSubmissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["all-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_submissions")
        .select(`
          *,
          user:profiles!assessment_submissions_user_id_fkey(id, full_name, email),
          assessment:assessments(id, title, description, max_score),
          course:courses(id, title)
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      
      return data.map((s: any) => ({
        ...s,
        submitted_files: (s.submitted_files || []) as SubmittedFile[],
      })) as AssessmentSubmission[];
    },
  });

  const pendingSubmissions = submissions?.filter(s => s.status === "submitted") || [];

  const gradeSubmission = useMutation({
    mutationFn: async ({
      submissionId,
      score,
      comments,
      status = "graded",
    }: {
      submissionId: string;
      score: number;
      comments?: string;
      status?: "graded" | "needs_revision";
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Get the submission details first for the notification
      const { data: submissionData } = await supabase
        .from("assessment_submissions")
        .select(`
          user_id,
          assessment_id,
          course_id,
          max_score,
          assessment:assessments(title),
          course:courses(title)
        `)
        .eq("id", submissionId)
        .single();

      const { data, error } = await supabase
        .from("assessment_submissions")
        .update({
          score,
          manager_comments: comments,
          status,
          graded_at: new Date().toISOString(),
          graded_by: userData.user.id,
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;

      // Create notification for the learner
      if (submissionData) {
        const assessmentTitle = (submissionData.assessment as any)?.title || "Assignment";
        const notificationTitle = status === "needs_revision" 
          ? "Assignment Needs Revision" 
          : "Assignment Graded";
        const notificationMessage = status === "needs_revision"
          ? `Your assignment "${assessmentTitle}" needs revision. Please review the feedback and resubmit.`
          : `Your assignment "${assessmentTitle}" has been graded. Score: ${score}/${submissionData.max_score}`;

        await supabase.from("notifications").insert({
          user_id: submissionData.user_id,
          type: "assignment_graded",
          title: notificationTitle,
          message: notificationMessage,
          metadata: {
            submission_id: submissionId,
            assessment_id: submissionData.assessment_id,
            course_id: submissionData.course_id,
            score: score,
            max_score: submissionData.max_score,
            status: status,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-submissions"] });
      toast({ title: "Submission graded successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to grade", description: error.message, variant: "destructive" });
    },
  });

  return {
    submissions,
    pendingSubmissions,
    isLoading,
    gradeSubmission,
  };
}
