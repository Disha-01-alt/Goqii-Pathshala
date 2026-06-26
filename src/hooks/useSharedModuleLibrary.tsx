import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";

interface Module {
  id: string;
  title: string;
  description: string | null;
  slides: any;
  thumbnail_url: string | null;
  is_favorite: boolean;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
  module_type: string;
  visibility: string;
  user_id: string;
  creator?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  module_tags: {
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

// Hook for managers to access shared modules based on their access permissions
// Also used by SMEs/Admins to see all modules with creator info
export function useSharedModuleLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["shared-modules-with-creators"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch modules (RLS handles filtering based on role/access)
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select(`
          *,
          module_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (modulesError) throw modulesError;

      // Get unique user IDs from modules
      const userIds = [...new Set(modulesData.map((m) => m.user_id))];

      // Fetch profiles for all module creators
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Continue without profiles if there's an error
      }

      // Combine modules with creator info
      return modulesData.map((module) => ({
        ...module,
        creator: profiles?.find((p) => p.id === module.user_id),
      })) as Module[];
    },
  });

  const filteredModules = useMemo(() => {
    let result = modules;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (module) =>
          module.title.toLowerCase().includes(query) ||
          module.description?.toLowerCase().includes(query) ||
          module.creator?.full_name?.toLowerCase().includes(query) ||
          module.creator?.email.toLowerCase().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [modules, searchQuery, sortBy]);

  return {
    modules: filteredModules,
    allModules: modules,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
  };
}
