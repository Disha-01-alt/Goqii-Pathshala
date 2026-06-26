import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  access_type: "public" | "private";
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrganizations() {
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Organization[];
    },
  });

  const createOrganization = useMutation({
    mutationFn: async ({
      name,
      accessType,
      description,
    }: {
      name: string;
      accessType: "public" | "private";
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.from("organizations").insert({
        name,
        access_type: accessType,
        description: description || null,
        created_by: user?.id,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create organization: " + error.message);
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async ({
      id,
      name,
      accessType,
      description,
      isActive,
    }: {
      id: string;
      name?: string;
      accessType?: "public" | "private";
      description?: string;
      isActive?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (accessType !== undefined) updates.access_type = accessType;
      if (description !== undefined) updates.description = description;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update organization: " + error.message);
    },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organizations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete organization: " + error.message);
    },
  });

  return {
    organizations,
    isLoading,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  };
}
