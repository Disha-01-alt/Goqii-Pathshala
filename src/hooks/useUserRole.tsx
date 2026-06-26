import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "learner" | "manager" | "sme" | "sme_expert" | "admin";

interface UserRoleState {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSME: boolean;
  isSMEExpert: boolean;
  isLearner: boolean;
}

export function useUserRole(): UserRoleState {
  const { user, loading: authLoading } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_role', {
        _user_id: user!.id
      });

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      return data as AppRole;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const loading = authLoading || (!!user && isLoading);

  return {
    role: role ?? null,
    loading,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isSME: role === "sme",
    isSMEExpert: role === "sme_expert",
    isLearner: role === "learner",
  };
}