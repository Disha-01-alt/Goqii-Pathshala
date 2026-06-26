import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrganizationCourseSetting {
  id: string;
  organization_id: string;
  course_id: string;
  module_id: string;
  is_module_enabled: boolean;
  disabled_assignment_indices: number[];
  created_at: string;
  updated_at: string;
}

interface ModuleSettings {
  moduleId: string;
  isEnabled: boolean;
  disabledAssignmentIndices: number[];
}

export function useOrganizationCourseSettings(courseId: string) {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Map<string, ModuleSettings>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch user's organization
  const { data: userOrganization } = useQuery({
    queryKey: ["user-organization"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.organization_id || null;
    },
  });

  // Fetch existing settings for this course
  const { data: existingSettings = [], isLoading } = useQuery({
    queryKey: ["organization-course-settings", courseId, userOrganization],
    queryFn: async () => {
      if (!userOrganization || !courseId) return [];

      const { data, error } = await supabase
        .from("organization_course_settings")
        .select("*")
        .eq("organization_id", userOrganization)
        .eq("course_id", courseId);

      if (error) throw error;
      return data as OrganizationCourseSetting[];
    },
    enabled: !!userOrganization && !!courseId,
  });

  // Initialize local settings from existing settings
  const initializeLocalSettings = useCallback((moduleIds: string[]) => {
    const newSettings = new Map<string, ModuleSettings>();
    
    moduleIds.forEach(moduleId => {
      const existing = existingSettings.find(s => s.module_id === moduleId);
      newSettings.set(moduleId, {
        moduleId,
        isEnabled: existing?.is_module_enabled ?? true,
        disabledAssignmentIndices: existing?.disabled_assignment_indices ?? [],
      });
    });
    
    setLocalSettings(newSettings);
    setHasChanges(false);
  }, [existingSettings]);

  // Toggle module enabled state
  const toggleModule = useCallback((moduleId: string, enabled: boolean) => {
    setLocalSettings(prev => {
      const newSettings = new Map(prev);
      const current = newSettings.get(moduleId) || {
        moduleId,
        isEnabled: true,
        disabledAssignmentIndices: [],
      };
      newSettings.set(moduleId, { ...current, isEnabled: enabled });
      return newSettings;
    });
    setHasChanges(true);
  }, []);

  // Toggle assignment enabled state
  const toggleAssignment = useCallback((moduleId: string, assignmentIndex: number, enabled: boolean) => {
    setLocalSettings(prev => {
      const newSettings = new Map(prev);
      const current = newSettings.get(moduleId) || {
        moduleId,
        isEnabled: true,
        disabledAssignmentIndices: [],
      };
      
      let disabledIndices = [...current.disabledAssignmentIndices];
      if (enabled) {
        disabledIndices = disabledIndices.filter(i => i !== assignmentIndex);
      } else {
        if (!disabledIndices.includes(assignmentIndex)) {
          disabledIndices.push(assignmentIndex);
        }
      }
      
      newSettings.set(moduleId, { ...current, disabledAssignmentIndices: disabledIndices });
      return newSettings;
    });
    setHasChanges(true);
  }, []);

  // Check if module is enabled
  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    const setting = localSettings.get(moduleId);
    return setting?.isEnabled ?? true;
  }, [localSettings]);

  // Check if assignment is enabled
  const isAssignmentEnabled = useCallback((moduleId: string, assignmentIndex: number): boolean => {
    const setting = localSettings.get(moduleId);
    if (!setting?.isEnabled) return false;
    return !setting.disabledAssignmentIndices.includes(assignmentIndex);
  }, [localSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!userOrganization || !courseId) throw new Error("Missing organization or course");

      const settings = Array.from(localSettings.values());
      
      // Upsert all settings
      for (const setting of settings) {
        const { error } = await supabase
          .from("organization_course_settings")
          .upsert({
            organization_id: userOrganization,
            course_id: courseId,
            module_id: setting.moduleId,
            is_module_enabled: setting.isEnabled,
            disabled_assignment_indices: setting.disabledAssignmentIndices,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "organization_id,course_id,module_id",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-course-settings"] });
      setHasChanges(false);
      toast.success("Preferences saved successfully");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save preferences");
    },
  });

  // Get enabled modules count
  const enabledModulesCount = useMemo(() => {
    let count = 0;
    localSettings.forEach(setting => {
      if (setting.isEnabled) count++;
    });
    return count;
  }, [localSettings]);

  // Get enabled assignments count
  const getEnabledAssignmentsCount = useCallback((moduleAssignments: { moduleId: string; count: number }[]): number => {
    let total = 0;
    moduleAssignments.forEach(({ moduleId, count }) => {
      const setting = localSettings.get(moduleId);
      if (setting?.isEnabled) {
        total += count - (setting.disabledAssignmentIndices?.length || 0);
      }
    });
    return total;
  }, [localSettings]);

  return {
    isLoading,
    userOrganization,
    existingSettings,
    localSettings,
    hasChanges,
    initializeLocalSettings,
    toggleModule,
    toggleAssignment,
    isModuleEnabled,
    isAssignmentEnabled,
    saveSettings: saveSettingsMutation.mutate,
    isSaving: saveSettingsMutation.isPending,
    enabledModulesCount,
    getEnabledAssignmentsCount,
  };
}
