import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaveModuleData {
  id?: string;
  title: string;
  description?: string;
  slides: any; // Can be array (legacy) or object with chapters/quiz/sections
  thumbnailUrl?: string;
  isFavorite?: boolean;
  tagIds?: string[];
  moduleType?: string;
  visibility?: "public" | "private";
  timeLimitMinutes?: number;
  approvalStatus?: "draft" | "pending_review";
}

export function useSaveModule() {
  const queryClient = useQueryClient();

  const saveModule = useMutation({
    mutationFn: async (data: SaveModuleData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const moduleData = {
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        slides: data.slides,
        thumbnail_url: data.thumbnailUrl || null,
        is_favorite: data.isFavorite || false,
        module_type: data.moduleType || "presentation",
        visibility: data.visibility || "private",
        time_limit_minutes: data.timeLimitMinutes || null,
        approval_status: data.approvalStatus || "draft",
        submitted_for_review_at: data.approvalStatus === "pending_review" ? new Date().toISOString() : null,
        submitted_by: data.approvalStatus === "pending_review" ? user.id : null,
      };

      let moduleId = data.id;

      if (data.id) {
        // Update existing module
        const { error } = await supabase
          .from("modules")
          .update(moduleData)
          .eq("id", data.id);
        
        if (error) throw error;
      } else {
        // Insert new module
        const { data: newModule, error } = await supabase
          .from("modules")
          .insert(moduleData)
          .select()
          .single();
        
        if (error) throw error;
        moduleId = newModule.id;
      }

      // Handle tags if provided
      if (data.tagIds && moduleId) {
        // Delete existing tags
        await supabase
          .from("module_tags")
          .delete()
          .eq("module_id", moduleId);

        // Insert new tags
        if (data.tagIds.length > 0) {
          const moduleTags = data.tagIds.map(tagId => ({
            module_id: moduleId,
            tag_id: tagId,
          }));

          const { error: tagError } = await supabase
            .from("module_tags")
            .insert(moduleTags);

          if (tagError) throw tagError;
        }
      }

      return { id: moduleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save module");
    },
  });

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Module deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete module");
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ moduleId, isFavorite }: { moduleId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("modules")
        .update({ is_favorite: isFavorite })
        .eq("id", moduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update favorite");
    },
  });

  return {
    saveModule: saveModule.mutate,
    saveModuleAsync: saveModule.mutateAsync,
    deleteModule: deleteModule.mutate,
    toggleFavorite: toggleFavorite.mutate,
    isSaving: saveModule.isPending,
    isDeleting: deleteModule.isPending,
  };
}
