import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface OrganizationAssignmentSetting {
  id: string;
  organization_id: string;
  module_id: string;
  assignment_index: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useOrganizationAssignments(moduleId?: string) {
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

  // Fetch assignment settings for a module
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["organization-assignment-settings", userOrg, moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_assignment_settings")
        .select("*")
        .eq("organization_id", userOrg!)
        .eq("module_id", moduleId!);

      if (error) throw error;
      return data as OrganizationAssignmentSetting[];
    },
    enabled: !!userOrg && !!moduleId,
  });

  // Toggle assignment enabled/disabled
  const toggleAssignment = useMutation({
    mutationFn: async ({
      assignmentIndex,
      isEnabled,
    }: {
      assignmentIndex: number;
      isEnabled: boolean;
    }) => {
      if (!userOrg || !moduleId) throw new Error("Missing organization or module");

      // Check if setting exists
      const existing = settings.find(s => s.assignment_index === assignmentIndex);

      if (existing) {
        const { error } = await supabase
          .from("organization_assignment_settings")
          .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_assignment_settings")
          .insert({
            organization_id: userOrg,
            module_id: moduleId,
            assignment_index: assignmentIndex,
            is_enabled: isEnabled,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-assignment-settings", userOrg, moduleId],
      });
      toast.success("Assignment setting updated");
    },
    onError: (error) => {
      console.error("Error toggling assignment:", error);
      toast.error("Failed to update assignment setting");
    },
  });

  // Initialize default settings for a module (all enabled by default)
  const initializeSettings = useMutation({
    mutationFn: async (assignmentCount: number) => {
      if (!userOrg || !moduleId) throw new Error("Missing organization or module");

      const settingsToInsert = Array.from({ length: assignmentCount }, (_, i) => ({
        organization_id: userOrg,
        module_id: moduleId,
        assignment_index: i,
        is_enabled: true,
      }));

      const { error } = await supabase
        .from("organization_assignment_settings")
        .upsert(settingsToInsert, {
          onConflict: "organization_id,module_id,assignment_index",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-assignment-settings", userOrg, moduleId],
      });
    },
  });

  // Helper to check if an assignment is enabled
  const isAssignmentEnabled = (index: number): boolean => {
    const setting = settings.find(s => s.assignment_index === index);
    return setting?.is_enabled ?? true; // Default to enabled if no setting
  };

  return {
    settings,
    isLoading,
    userOrganization: userOrg,
    toggleAssignment: toggleAssignment.mutate,
    isToggling: toggleAssignment.isPending,
    initializeSettings: initializeSettings.mutate,
    isAssignmentEnabled,
  };
}
