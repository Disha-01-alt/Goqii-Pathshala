import { useNavigate } from "react-router-dom";
import { useModuleLibrary } from "@/hooks/useModuleLibrary";
import { useTagManager } from "@/hooks/useTagManager";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ModuleCard } from "@/components/ModuleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Star, X, FolderOpen, Loader2, ArrowLeft } from "lucide-react";
import { useEffect, useMemo } from "react";
import { AppSidebar } from "@/components/AppSidebar";

export default function MyModules() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    modules,
    allModules,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    sortBy,
    setSortBy,
    favoritesOnly,
    setFavoritesOnly,
    hasMore,
    loadMore,
  } = useModuleLibrary();
  const { tags } = useTagManager();

  // Filter to only show modules created by the current user
  const myModules = useMemo(() => {
    return modules.filter((module) => module.user_id === user?.id);
  }, [modules, user?.id]);

  const myAllModules = useMemo(() => {
    return allModules.filter((module) => module.user_id === user?.id);
  }, [allModules, user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(
      selectedTags.includes(tagId)
        ? selectedTags.filter((id) => id !== tagId)
        : [...selectedTags, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setFavoritesOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || favoritesOnly;

  if (authLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full" />
              ))}
            </div>
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Modules</h1>
                <p className="text-xs text-muted-foreground">
                  {myAllModules.length} modules created by you
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/create")} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              New Module
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-card border rounded-lg p-3 mb-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search your modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                </SelectContent>
              </Select>

              {/* Favorites toggle */}
              <div className="flex items-center gap-1.5 border rounded-md px-2 h-8">
                <Switch
                  id="favorites"
                  checked={favoritesOnly}
                  onCheckedChange={setFavoritesOnly}
                  className="scale-75"
                />
                <Label htmlFor="favorites" className="cursor-pointer flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3" />
                  Favorites
                </Label>
              </div>
            </div>

            {/* Tag filters */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filter by tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      style={
                        selectedTags.includes(tag.id)
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { borderColor: tag.color, color: tag.color }
                      }
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear all filters
              </Button>
            )}
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : myModules.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">
                {hasActiveFilters ? "No modules found" : "No modules yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Create your first learning module to get started"}
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => navigate("/create")} size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Module
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Results count */}
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {myModules.length} filtered modules
                </p>
              )}

              {/* Module grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {myModules.map((module) => (
                  <ModuleCard 
                    key={module.id} 
                    module={module} 
                    showOwnerActions={true}
                    showCreator={false}
                  />
                ))}
              </div>

              {/* Load More button */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" size="lg" onClick={loadMore}>
                    <Loader2 className="mr-2 h-4 w-4" />
                    Load More Modules
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppSidebar>
  );
}