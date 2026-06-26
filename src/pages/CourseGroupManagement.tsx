import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { useCourseGroups, CourseGroup } from "@/hooks/useCourseGroups";
import { useCourseLibrary } from "@/hooks/useCourseLibrary";
import { useLearners } from "@/hooks/useLearners";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Plus,
  FolderOpen,
  BookOpen,
  Trash2,
  Users,
  Send,
  X,
} from "lucide-react";

export default function CourseGroupManagement() {
  const navigate = useNavigate();
  const { isManager, isAdmin, loading: roleLoading } = useUserRole();
  const {
    groups,
    isLoading,
    userOrganization,
    createGroup,
    isCreating,
    deleteGroup,
    isDeleting,
    addCourseToGroup,
    isAddingCourse,
    removeCourseFromGroup,
    assignGroupToLearners,
    isAssigning,
  } = useCourseGroups();
  const { courses } = useCourseLibrary();
  const { learners } = useLearners();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<CourseGroup | null>(null);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup(
      { name: newGroupName.trim(), description: newGroupDescription.trim() || undefined },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setNewGroupName("");
          setNewGroupDescription("");
        },
      }
    );
  };

  const handleAddCourse = (courseId: string) => {
    if (!selectedGroup) return;
    addCourseToGroup({ groupId: selectedGroup.id, courseId });
  };

  const handleRemoveCourse = (groupId: string, courseId: string) => {
    removeCourseFromGroup({ groupId, courseId });
  };

  const handleAssignToLearners = () => {
    if (!selectedGroup || selectedLearners.length === 0) return;
    assignGroupToLearners(
      { groupId: selectedGroup.id, learnerIds: selectedLearners },
      {
        onSuccess: () => {
          setAssignDialogOpen(false);
          setSelectedLearners([]);
          setSelectedGroup(null);
        },
      }
    );
  };

  const handleDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroup(groupToDelete, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setGroupToDelete(null);
        },
      });
    }
  };

  const getCoursesInGroup = (group: CourseGroup) => {
    return group.courses?.map(c => c.course).filter(Boolean) || [];
  };

  const getAvailableCourses = (group: CourseGroup) => {
    const coursesInGroup = new Set(group.courses?.map(c => c.course_id) || []);
    return courses.filter(c => c.is_published && !coursesInGroup.has(c.id));
  };

  if (roleLoading || isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppSidebar>
    );
  }

  if (!isManager && !isAdmin) {
    navigate("/");
    return null;
  }

  if (!userOrganization) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">No Organization Found</h2>
                <p className="text-muted-foreground">
                  You need to be assigned to an organization to manage course groups.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/manager")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Course Groups</h1>
                <p className="text-muted-foreground text-sm">
                  Create bundles of courses for bulk assignment
                </p>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          </div>

          {/* Groups Grid */}
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Course Groups Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first course group to bundle courses together for easy assignment.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => {
                const coursesInGroup = getCoursesInGroup(group);
                return (
                  <Card key={group.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {group.description && (
                            <CardDescription className="mt-1">{group.description}</CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setGroupToDelete(group.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {/* Courses in group */}
                      <div className="flex-1 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {coursesInGroup.length} Course{coursesInGroup.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {coursesInGroup.map((course: any) => (
                            <div
                              key={course.id}
                              className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1"
                            >
                              <span className="truncate">{course.title}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveCourse(group.id, course.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {coursesInGroup.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                              No courses added yet
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => {
                            setSelectedGroup(group);
                            setAddCourseDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Add Course
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          disabled={coursesInGroup.length === 0}
                          onClick={() => {
                            setSelectedGroup(group);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <Send className="h-3 w-3" />
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Course Group</DialogTitle>
            <DialogDescription>
              Create a new group to bundle courses together for easy assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Group Name *</label>
              <Input
                placeholder="e.g., Onboarding Bundle"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Optional description..."
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Courses to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Select courses to add to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedGroup && getAvailableCourses(selectedGroup).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                All available courses have been added to this group.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedGroup &&
                  getAvailableCourses(selectedGroup).map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleAddCourse(course.id)}
                      disabled={isAddingCourse}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium">{course.title}</p>
                        {course.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {course.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">Add</Badge>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Learners Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Select learners to assign all courses in this group.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {learners.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No learners found. Add learners first.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {learners.map((learner) => (
                  <label
                    key={learner.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedLearners.includes(learner.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLearners([...selectedLearners, learner.id]);
                        } else {
                          setSelectedLearners(selectedLearners.filter((id) => id !== learner.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{learner.full_name || learner.email}</p>
                      {learner.full_name && (
                        <p className="text-sm text-muted-foreground">{learner.email}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignToLearners}
              disabled={selectedLearners.length === 0 || isAssigning}
              className="gap-2"
            >
              {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Assign to {selectedLearners.length} Learner{selectedLearners.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the course group. Existing course assignments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppSidebar>
  );
}
