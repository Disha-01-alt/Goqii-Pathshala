import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderPlus, ChevronDown, Plus, Loader2, Check } from "lucide-react";
import { useCourseGroups } from "@/hooks/useCourseGroups";
import { toast } from "sonner";

interface AddToCourseGroupButtonProps {
  courseId: string;
  disabled?: boolean;
}

export function AddToCourseGroupButton({ courseId, disabled }: AddToCourseGroupButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  const {
    groups,
    isLoading,
    createGroup,
    isCreating: isCreatingGroup,
    addCourseToGroup,
    isAddingCourse,
  } = useCourseGroups();

  const handleAddToGroup = async (groupId: string) => {
    // Check if course is already in this group
    const group = groups.find(g => g.id === groupId);
    if (group?.courses.some(c => c.course_id === courseId)) {
      toast.info("Course is already in this group");
      setIsOpen(false);
      return;
    }

    addCourseToGroup({ groupId, courseId });
    setIsOpen(false);
  };

  const handleCreateAndAdd = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    createGroup(
      { name: newGroupName.trim() },
      {
        onSuccess: (newGroup) => {
          if (newGroup?.id) {
            addCourseToGroup({ groupId: newGroup.id, courseId });
          }
          setNewGroupName("");
          setIsCreating(false);
          setIsOpen(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateAndAdd();
    }
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewGroupName("");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled} className="gap-2">
          <FolderPlus className="h-4 w-4" />
          Add to Course Group
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {groups.length === 0 && !isCreating ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No course groups yet
              </div>
            ) : (
              groups.map((group) => {
                const isInGroup = group.courses.some(c => c.course_id === courseId);
                return (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => handleAddToGroup(group.id)}
                    disabled={isAddingCourse}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{group.name}</span>
                    {isInGroup && <Check className="h-4 w-4 text-primary ml-2" />}
                  </DropdownMenuItem>
                );
              })
            )}

            <DropdownMenuSeparator />

            {isCreating ? (
              <div className="p-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  <Input
                    placeholder="Group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateAndAdd}
                    disabled={isCreatingGroup || !newGroupName.trim()}
                    className="h-8"
                  >
                    {isCreatingGroup ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setIsCreating(true);
                }}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Group
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
