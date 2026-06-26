import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Level {
  id: string;
  name: string;
  display_name: string;
  order_index: number;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

export function useLevels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ["levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levels")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as Level[];
    },
    enabled: !!user,
  });

  const createLevel = useMutation({
    mutationFn: async (level: { name: string; display_name: string; order_index: number; description?: string }) => {
      const { data, error } = await supabase
        .from("levels")
        .insert({
          ...level,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Level created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create level: " + error.message);
    },
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Level> & { id: string }) => {
      const { data, error } = await supabase
        .from("levels")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Level updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update level: " + error.message);
    },
  });

  const deleteLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Level deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete level: " + error.message);
    },
  });

  return {
    levels,
    isLoading,
    createLevel,
    updateLevel,
    deleteLevel,
  };
}
