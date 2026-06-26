import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ModuleAssignmentStatus = "not_submitted" | "submitted" | "graded" | "needs_revision";

export interface SubmittedFile {
  name: string;
  url: string;
}

export interface ModuleAssignmentSubmission {
  id: string;
  module_assignment_id: string;
  module_id: string;
  course_id: string;
  user_id: string;
  status: ModuleAssignmentStatus;
  submitted_files: SubmittedFile[];
  response_text: string | null;
  score: number | null;
  max_score: number;
  manager_comments: string | null;
  submitted_at: string | null;
  graded_at: string | null;
}

/** All of the current learner's module-assignment submissions (optionally filtered). */
export function useMyModuleAssignmentSubmissions(opts?: { moduleId?: string; courseId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["my-module-assignment-submissions", opts?.moduleId ?? null, opts?.courseId ?? null],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [] as ModuleAssignmentSubmission[];

      let q = supabase
        .from("module_assignment_submissions" as any)
        .select("*")
        .eq("user_id", userData.user.id);

      if (opts?.moduleId) q = q.eq("module_id", opts.moduleId);
      if (opts?.courseId) q = q.eq("course_id", opts.courseId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        submitted_files: (s.submitted_files || []) as SubmittedFile[],
      })) as ModuleAssignmentSubmission[];
    },
  });

  return { submissions: data ?? [], isLoading };
}

/** Pending module-assignment items across all the learner's assigned courses. */
export function usePendingModuleAssignments() {
  const { data, isLoading } = useQuery({
    queryKey: ["pending-module-assignments"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data: courseAssignments } = await supabase
        .from("course_assignments")
        .select("course_id")
        .eq("user_id", userData.user.id);

      const courseIds = (courseAssignments || []).map((ca) => ca.course_id);
      if (courseIds.length === 0) return [];

      const { data: courseModules } = await supabase
        .from("course_modules")
        .select("course_id, module_id, course:courses(id,title), module:modules(id,title)")
        .in("course_id", courseIds);

      const moduleIds = Array.from(new Set((courseModules || []).map((cm: any) => cm.module_id)));
      if (moduleIds.length === 0) return [];

      const { data: assignments } = await supabase
        .from("module_assignments" as any)
        .select("id, module_id, title, goal, instructions, expected_output")
        .in("module_id", moduleIds);

      const { data: subs } = await supabase
        .from("module_assignment_submissions" as any)
        .select("module_assignment_id, course_id, status, score, max_score, manager_comments, submitted_files")
        .eq("user_id", userData.user.id);

      // Build a row per (assignment, course) pairing — same module can be in many courses
      const items: any[] = [];
      for (const cm of courseModules || []) {
        const cmAny = cm as any;
        const moduleAssignments = (assignments || []).filter((a: any) => a.module_id === cmAny.module_id);
        for (const a of moduleAssignments) {
          const sub: any = (subs || []).find(
            (s: any) => s.module_assignment_id === (a as any).id && s.course_id === cmAny.course_id
          );
          items.push({
            id: `${(a as any).id}:${cmAny.course_id}`,
            kind: "module_assignment" as const,
            moduleAssignmentId: (a as any).id,
            moduleId: cmAny.module_id,
            courseId: cmAny.course_id,
            courseName: cmAny.course?.title || "Course",
            moduleName: cmAny.module?.title || "Module",
            title: (a as any).title || "Assignment",
            description: (a as any).goal || (a as any).instructions || null,
            status: ((sub?.status as ModuleAssignmentStatus) || "not_submitted") as ModuleAssignmentStatus,
            score: sub?.score ?? null,
            maxScore: sub?.max_score ?? 100,
            managerComments: sub?.manager_comments ?? null,
            submittedFiles: (Array.isArray(sub?.submitted_files) ? sub.submitted_files : []) as SubmittedFile[],
          });
        }
      }
      return items;
    },
  });

  return { pendingModuleAssignments: data ?? [], isLoading };
}

/** Submit / resubmit a module assignment. */
export function useSubmitModuleAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      moduleAssignmentId,
      moduleId,
      courseId,
      responseText,
      files,
    }: {
      moduleAssignmentId: string;
      moduleId: string;
      courseId: string;
      responseText?: string;
      files?: SubmittedFile[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("module_assignment_submissions" as any)
        .select("id")
        .eq("module_assignment_id", moduleAssignmentId)
        .eq("course_id", courseId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from("module_assignment_submissions" as any)
          .update({
            response_text: responseText ?? null,
            submitted_files: JSON.parse(JSON.stringify(files || [])),
            status: "submitted" as const,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("module_assignment_submissions" as any)
          .insert([{
            module_assignment_id: moduleAssignmentId,
            module_id: moduleId,
            course_id: courseId,
            user_id: userData.user.id,
            response_text: responseText ?? null,
            submitted_files: JSON.parse(JSON.stringify(files || [])),
            status: "submitted" as const,
            submitted_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-module-assignment-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-module-assignments"] });
      toast({ title: "Assignment submitted" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to submit", description: e.message, variant: "destructive" });
    },
  });
}
