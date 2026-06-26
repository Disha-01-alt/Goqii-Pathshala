import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useAssessments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Assessment[];
    },
  });

  const createAssessment = useMutation({
    mutationFn: async (assessment: {
      title: string;
      description?: string;
      instructions?: string;
      max_score?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("assessments")
        .insert({
          ...assessment,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "Assignment created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create assignment", description: error.message, variant: "destructive" });
    },
  });

  const updateAssessment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Assessment> & { id: string }) => {
      const { data, error } = await supabase
        .from("assessments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Assessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "Assignment updated" });
    },
  });

  const deleteAssessment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "Assignment deleted" });
    },
  });

  return {
    assessments,
    isLoading,
    createAssessment,
    updateAssessment,
    deleteAssessment,
  };
}
