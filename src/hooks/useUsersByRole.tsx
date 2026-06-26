import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { AppRole } from "./useUserRole";

export interface UserOrganization {
  id: string;
  name: string;
  access_type: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  organizations: UserOrganization[];
}

export function useUsersByRole(role: AppRole) {
  const { user } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-by-role", role],
    queryFn: async () => {
      // Fetch user_ids with the specified role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role);

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r) => r.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch user organizations
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from("user_organizations")
        .select("user_id, organization_id")
        .in("user_id", userIds);

      if (userOrgsError) throw userOrgsError;

      // Fetch organization details
      const orgIds = [...new Set((userOrgs || []).map((uo) => uo.organization_id))];
      let orgsMap: Record<string, UserOrganization> = {};
      
      if (orgIds.length > 0) {
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("id, name, access_type")
          .in("id", orgIds);

        if (orgsError) throw orgsError;

        orgsMap = (orgsData || []).reduce((acc, org) => {
          acc[org.id] = org;
          return acc;
        }, {} as Record<string, UserOrganization>);
      }

      // Map user organizations
      const userOrgsMap: Record<string, UserOrganization[]> = {};
      (userOrgs || []).forEach((uo) => {
        if (!userOrgsMap[uo.user_id]) {
          userOrgsMap[uo.user_id] = [];
        }
        if (orgsMap[uo.organization_id]) {
          userOrgsMap[uo.user_id].push(orgsMap[uo.organization_id]);
        }
      });

      return (profiles || []).map((profile) => ({
        ...profile,
        organizations: userOrgsMap[profile.id] || [],
      })) as UserWithRole[];
    },
    enabled: !!user,
  });

  return {
    users,
    isLoading,
  };
}
