import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CourseAssignment {
  id: string;
  course_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
}

export function useCourseAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["course-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data as CourseAssignment[];
    },
    enabled: !!user,
  });

  const assignCourses = useMutation({
    mutationFn: async ({
      courseIds,
      learnerIds,
      dueDate,
    }: {
      courseIds: string[];
      learnerIds: string[];
      dueDate?: string;
    }) => {
      const assignmentsToCreate = courseIds.flatMap((courseId) =>
        learnerIds.map((learnerId) => ({
          course_id: courseId,
          user_id: learnerId,
          assigned_by: user?.id,
          due_date: dueDate || null,
        }))
      );

      const { error } = await supabase
        .from("course_assignments")
        .upsert(assignmentsToCreate, {
          onConflict: "course_id,user_id",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      return { count: assignmentsToCreate.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course-assignments"] });
      toast.success(`Successfully assigned ${data.count} course(s)`);
    },
    onError: (error) => {
      toast.error("Failed to assign courses: " + error.message);
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async ({
      courseId,
      userId,
    }: {
      courseId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("course_assignments")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-assignments"] });
      toast.success("Assignment removed");
    },
    onError: (error) => {
      toast.error("Failed to remove assignment: " + error.message);
    },
  });

  return {
    assignments,
    isLoading,
    assignCourses: assignCourses.mutateAsync,
    isAssigning: assignCourses.isPending,
    removeAssignment: removeAssignment.mutate,
  };
}
