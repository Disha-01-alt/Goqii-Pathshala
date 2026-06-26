import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { useAuth } from "./useAuth";

interface ModuleListItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
  module_type: string;
  visibility: string;
  user_id: string;
  approval_status: string | null;
  submitted_for_review_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  module_tags: {
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

const MODULES_PER_PAGE = 30;

export function useModuleLibrary() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "updated">("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["modules", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Optimized query: only select fields needed for list view (no slides JSON)
      // RLS policies handle filtering by role automatically
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          is_favorite,
          is_published,
          created_at,
          updated_at,
          module_type,
          visibility,
          user_id,
          approval_status,
          submitted_for_review_at,
          reviewed_at,
          review_notes,
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

      if (error) throw error;
      return data as ModuleListItem[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
          module.module_tags.some((mt) =>
            mt.tags.name.toLowerCase().includes(query)
          )
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter((module) =>
        selectedTags.every((tagId) =>
          module.module_tags.some((mt) => mt.tag_id === tagId)
        )
      );
    }

    // Favorites filter
    if (favoritesOnly) {
      result = result.filter((module) => module.is_favorite);
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
        case "updated":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [modules, searchQuery, selectedTags, sortBy, favoritesOnly]);

  // Paginated results
  const paginatedModules = useMemo(() => {
    return filteredModules.slice(0, page * MODULES_PER_PAGE);
  }, [filteredModules, page]);

  const hasMore = paginatedModules.length < filteredModules.length;

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Reset pagination when filters change
  const resetPagination = () => {
    setPage(1);
  };

  return {
    modules: paginatedModules,
    allModules: modules,
    totalFiltered: filteredModules.length,
    isLoading,
    searchQuery,
    setSearchQuery: (query: string) => {
      setSearchQuery(query);
      resetPagination();
    },
    selectedTags,
    setSelectedTags: (tags: string[]) => {
      setSelectedTags(tags);
      resetPagination();
    },
    sortBy,
    setSortBy: (sort: "newest" | "oldest" | "title" | "updated") => {
      setSortBy(sort);
      resetPagination();
    },
    favoritesOnly,
    setFavoritesOnly: (value: boolean) => {
      setFavoritesOnly(value);
      resetPagination();
    },
    hasMore,
    loadMore,
  };
}
