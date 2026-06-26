import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Loader2, FileText, Presentation, Video, File } from "lucide-react";
import { toast } from "sonner";

interface Module {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  module_type: string;
  is_published: boolean | null;
  approval_status: string | null;
}

interface CourseModule {
  module_id: string;
}

interface AddModuleToCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  existingModuleIds: string[];
}

export function AddModuleToCourseDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  existingModuleIds,
}: AddModuleToCourseDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);

  // Fetch approved modules (SME Experts can see approved modules even if not yet published)
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["approved-modules-for-course"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, title, description, thumbnail_url, module_type, is_published, approval_status")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Module[];
    },
    enabled: open,
  });

  // Filter out already added modules and apply search
  const availableModules = useMemo(() => {
    let filtered = modules.filter((m) => !existingModuleIds.includes(m.id));
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [modules, existingModuleIds, searchQuery]);

  // Add modules mutation
  const addModulesMutation = useMutation({
    mutationFn: async (moduleIds: string[]) => {
      // Get the current max order_index
      const { data: existingModules } = await supabase
        .from("course_modules")
        .select("order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: false })
        .limit(1);
      
      const startIndex = existingModules?.[0]?.order_index ?? -1;
      
      // Insert new modules with sequential order_index
      const newModules = moduleIds.map((moduleId, idx) => ({
        course_id: courseId,
        module_id: moduleId,
        order_index: startIndex + 1 + idx,
      }));

      const { error } = await supabase.from("course_modules").insert(newModules);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Added ${selectedModuleIds.length} module(s) to course`);
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setSelectedModuleIds([]);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error adding modules:", error);
      toast.error("Failed to add modules to course");
    },
  });

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSubmit = () => {
    if (selectedModuleIds.length === 0) {
      toast.error("Please select at least one module");
      return;
    }
    addModulesMutation.mutate(selectedModuleIds);
  };

  const ModuleIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "presentation":
      case "ppt":
        return <Presentation className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "pdf":
        return <File className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Modules to Course
          </DialogTitle>
          <DialogDescription>
            Select approved modules to add to "{courseTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          {selectedModuleIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedModuleIds.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedModuleIds([])}
              >
                Clear selection
              </Button>
            </div>
          )}

          {/* Module list */}
          <ScrollArea className="h-[350px] border rounded-lg p-2">
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableModules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No modules match your search"
                  : existingModuleIds.length === modules.length
                  ? "All approved modules are already in this course"
                  : "No approved modules available"}
              </div>
            ) : (
              <div className="space-y-2">
                {availableModules.map((module) => {
                  const isSelected = selectedModuleIds.includes(module.id);
                  return (
                    <Card
                      key={module.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleModule(module.id)}
                          className="mt-1"
                        />
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                          {module.thumbnail_url ? (
                            <img
                              src={module.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <ModuleIcon type={module.module_type} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm line-clamp-1">
                            {module.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {module.description || "No description"}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {module.module_type}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedModuleIds.length === 0 || addModulesMutation.isPending}
          >
            {addModulesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add {selectedModuleIds.length > 0 ? `${selectedModuleIds.length} ` : ""}Module
                {selectedModuleIds.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
