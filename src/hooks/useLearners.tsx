import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { toast } from "sonner";

export interface Learner {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export function useLearners() {
  const { user } = useAuth();
  const { isManager, isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ["learners", user?.id, isManager, isAdmin],
    queryFn: async () => {
      // Fetch profiles with learner role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "learner");

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) return [];

      let learnerIds = roles.map((r) => r.user_id);

      // For managers (non-admin): filter by organization
      if (isManager && !isAdmin) {
        // Get manager's organization
        const { data: managerOrg } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user?.id)
          .single();

        if (managerOrg) {
          // Get learners in the same organization
          const { data: orgLearners } = await supabase
            .from("user_organizations")
            .select("user_id")
            .eq("organization_id", managerOrg.organization_id)
            .in("user_id", learnerIds);

          learnerIds = orgLearners?.map((l) => l.user_id) || [];
        } else {
          // Manager has no org - no learners to show
          return [];
        }
      }

      if (!learnerIds.length) return [];

      // Fetch profiles for filtered learners
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", learnerIds);

      if (profilesError) throw profilesError;

      return profiles as Learner[];
    },
    enabled: !!user,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      toast.success("Learner status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  return {
    learners,
    isLoading,
    toggleActive,
  };
}
