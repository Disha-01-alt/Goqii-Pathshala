import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CourseGroup {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    course_id: string;
    order_index: number;
    course?: {
      id: string;
      title: string;
      description: string | null;
      is_published: boolean;
    };
  }[];
}

export interface CourseGroupItem {
  id: string;
  group_id: string;
  course_id: string;
  order_index: number;
  created_at: string;
}

export function useCourseGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's organization
  const { data: userOrg } = useQuery({
    queryKey: ["user-organization", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.organization_id;
    },
    enabled: !!user,
  });

  // Fetch all course groups for the organization
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["course-groups", userOrg],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select(`
          *,
          courses:course_group_items (
            id,
            course_id,
            order_index,
            course:courses (
              id,
              title,
              description,
              is_published
            )
          )
        `)
        .eq("organization_id", userOrg!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CourseGroup[];
    },
    enabled: !!userOrg,
  });

  // Create a new course group
  const createGroup = useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      if (!userOrg) throw new Error("No organization found");

      const { data, error } = await supabase
        .from("course_groups")
        .insert({
          name,
          description: description || null,
          organization_id: userOrg,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-groups", userOrg] });
      toast.success("Course group created");
    },
    onError: (error) => {
      console.error("Error creating course group:", error);
      toast.error("Failed to create course group");
    },
  });

  // Update a course group
  const updateGroup = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
    }: {
      id: string;
      name?: string;
      description?: string;
    }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      const { error } = await supabase
        .from("course_groups")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-groups", userOrg] });
      toast.success("Course group updated");
    },
    onError: (error) => {
      console.error("Error updating course group:", error);
      toast.error("Failed to update course group");
    },
  });

  // Delete a course group
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("course_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-groups", userOrg] });
      toast.success("Course group deleted");
    },
    onError: (error) => {
      console.error("Error deleting course group:", error);
      toast.error("Failed to delete course group");
    },
  });

  // Add a course to a group
  const addCourseToGroup = useMutation({
    mutationFn: async ({
      groupId,
      courseId,
    }: {
      groupId: string;
      courseId: string;
    }) => {
      // Get current max order
      const { data: existing } = await supabase
        .from("course_group_items")
        .select("order_index")
        .eq("group_id", groupId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase
        .from("course_group_items")
        .insert({
          group_id: groupId,
          course_id: courseId,
          order_index: nextOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-groups", userOrg] });
      toast.success("Course added to group");
    },
    onError: (error) => {
      console.error("Error adding course to group:", error);
      toast.error("Failed to add course to group");
    },
  });

  // Remove a course from a group
  const removeCourseFromGroup = useMutation({
    mutationFn: async ({
      groupId,
      courseId,
    }: {
      groupId: string;
      courseId: string;
    }) => {
      const { error } = await supabase
        .from("course_group_items")
        .delete()
        .eq("group_id", groupId)
        .eq("course_id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-groups", userOrg] });
      toast.success("Course removed from group");
    },
    onError: (error) => {
      console.error("Error removing course from group:", error);
      toast.error("Failed to remove course from group");
    },
  });

  // Assign all courses in a group to learners
  const assignGroupToLearners = useMutation({
    mutationFn: async ({
      groupId,
      learnerIds,
      dueDate,
    }: {
      groupId: string;
      learnerIds: string[];
      dueDate?: string;
    }) => {
      const group = groups.find(g => g.id === groupId);
      if (!group || !group.courses) throw new Error("Group not found");

      const courseIds = group.courses.map(c => c.course_id);
      
      // Create course assignments for all learners and all courses in the group
      const assignments = learnerIds.flatMap(learnerId =>
        courseIds.map(courseId => ({
          user_id: learnerId,
          course_id: courseId,
          assigned_by: user!.id,
          due_date: dueDate || null,
        }))
      );

      const { error } = await supabase
        .from("course_assignments")
        .upsert(assignments, {
          onConflict: "course_id,user_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-assignments"] });
      toast.success("Courses assigned to learners");
    },
    onError: (error) => {
      console.error("Error assigning group to learners:", error);
      toast.error("Failed to assign courses");
    },
  });

  return {
    groups,
    isLoading,
    userOrganization: userOrg,
    createGroup: createGroup.mutate,
    isCreating: createGroup.isPending,
    updateGroup: updateGroup.mutate,
    isUpdating: updateGroup.isPending,
    deleteGroup: deleteGroup.mutate,
    isDeleting: deleteGroup.isPending,
    addCourseToGroup: addCourseToGroup.mutate,
    isAddingCourse: addCourseToGroup.isPending,
    removeCourseFromGroup: removeCourseFromGroup.mutate,
    isRemovingCourse: removeCourseFromGroup.isPending,
    assignGroupToLearners: assignGroupToLearners.mutate,
    isAssigning: assignGroupToLearners.isPending,
  };
}
