import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Search, GripVertical, X, FileText, Presentation } from "lucide-react";
import { motion, Reorder } from "framer-motion";

interface Module {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  module_type: string;
}

interface ModuleSelectorProps {
  selectedModuleIds: string[];
  onSelectionChange: (moduleIds: string[]) => void;
}

export function ModuleSelector({ selectedModuleIds, onSelectionChange }: ModuleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["modules-for-course"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, title, description, thumbnail_url, module_type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Module[];
    },
  });

  const filteredModules = useMemo(() => {
    if (!searchQuery) return modules;
    const query = searchQuery.toLowerCase();
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
    );
  }, [modules, searchQuery]);

  const selectedModules = useMemo(() => {
    return selectedModuleIds
      .map((id) => modules.find((m) => m.id === id))
      .filter(Boolean) as Module[];
  }, [selectedModuleIds, modules]);

  const availableModules = useMemo(() => {
    return filteredModules.filter((m) => !selectedModuleIds.includes(m.id));
  }, [filteredModules, selectedModuleIds]);

  const addModule = (moduleId: string) => {
    onSelectionChange([...selectedModuleIds, moduleId]);
  };

  const removeModule = (moduleId: string) => {
    onSelectionChange(selectedModuleIds.filter((id) => id !== moduleId));
  };

  const handleReorder = (newOrder: Module[]) => {
    onSelectionChange(newOrder.map((m) => m.id));
  };

  const ModuleIcon = ({ type }: { type: string }) => {
    if (type === "presentation") return <Presentation className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Available Modules */}
      <div>
        <h3 className="font-medium mb-3">Available Modules</h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[300px] border rounded-lg p-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : availableModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No modules match your search" : "No more modules available"}
            </div>
          ) : (
            <div className="space-y-2">
              {availableModules.map((module) => (
                <Card
                  key={module.id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => addModule(module.id)}
                >
                  <div className="flex items-start gap-3">
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
                      <p className="font-medium text-sm line-clamp-1">{module.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {module.description || "No description"}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {module.module_type}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Selected Modules (Reorderable) */}
      <div>
        <h3 className="font-medium mb-3">
          Selected Modules ({selectedModules.length})
        </h3>
        <ScrollArea className="h-[300px] border rounded-lg p-2">
          {selectedModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Click modules on the left to add them
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={selectedModules}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {selectedModules.map((module, index) => (
                <Reorder.Item key={module.id} value={module}>
                  <motion.div
                    layout
                    className="flex items-center gap-2 p-3 bg-card border rounded-lg cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
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
                      <p className="font-medium text-sm line-clamp-1">{module.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {module.module_type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeModule(module.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
