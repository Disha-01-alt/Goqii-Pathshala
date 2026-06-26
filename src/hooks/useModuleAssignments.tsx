import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleAssignment {
  id: string;
  module_id: string;
  module_name: string;
  title: string;
  goal: string | null;
  instructions: string | null;
  expected_output: string | null;
  evaluation_criteria: any[];
  rubric: any | null;
  order_index: number;
  created_at: string;
}

export function useModuleAssignments(moduleId: string | undefined) {
  return useQuery({
    queryKey: ["module-assignments", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from("module_assignments" as any)
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index");

      if (error) throw error;
      return (data || []) as unknown as ModuleAssignment[];
    },
    enabled: !!moduleId,
  });
}

// Hook to fetch assignments for multiple modules at once
export function useModuleAssignmentsBatch(moduleIds: string[]) {
  return useQuery({
    queryKey: ["module-assignments-batch", moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("module_assignments" as any)
        .select("*")
        .in("module_id", moduleIds)
        .order("order_index");

      if (error) throw error;
      return (data || []) as unknown as ModuleAssignment[];
    },
    enabled: moduleIds.length > 0,
  });
}

// Hook to get assignment counts per module
export function useModuleAssignmentCounts(moduleIds: string[]) {
  return useQuery({
    queryKey: ["module-assignment-counts", moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("module_assignments" as any)
        .select("module_id")
        .in("module_id", moduleIds);

      if (error) throw error;
      
      // Count assignments per module
      const counts: Record<string, number> = {};
      const rows = (data || []) as unknown as { module_id: string }[];
      rows.forEach((row) => {
        counts[row.module_id] = (counts[row.module_id] || 0) + 1;
      });
      return counts;
    },
    enabled: moduleIds.length > 0,
  });
}
