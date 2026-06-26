import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleQuiz {
  id: string;
  module_id: string;
  module_name: string;
  questions: any[];
  settings: any;
  quiz_ai_used: string | null;
  created_at: string;
  updated_at: string;
}

export function useModuleQuizzes(moduleId: string | undefined) {
  return useQuery({
    queryKey: ["module-quizzes", moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      
      const { data, error } = await supabase
        .from("module_quizzes" as any)
        .select("*")
        .eq("module_id", moduleId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ModuleQuiz | null;
    },
    enabled: !!moduleId,
  });
}

// Hook to fetch quizzes for multiple modules at once
export function useModuleQuizzesBatch(moduleIds: string[]) {
  return useQuery({
    queryKey: ["module-quizzes-batch", moduleIds],
    queryFn: async () => {
      if (moduleIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("module_quizzes" as any)
        .select("*")
        .in("module_id", moduleIds);

      if (error) throw error;
      return (data || []) as unknown as ModuleQuiz[];
    },
    enabled: moduleIds.length > 0,
  });
}
