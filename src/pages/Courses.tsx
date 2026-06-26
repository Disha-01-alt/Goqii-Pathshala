import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseCard } from "@/components/CourseCard";
import { CourseAssignmentFlow } from "@/components/CourseAssignmentFlow";
import { useCourseLibrary } from "@/hooks/useCourseLibrary";
import { useSaveCourse } from "@/hooks/useSaveCourse";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, Search, BookOpen, Filter, Send } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
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

export default function Courses() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    courses,
    allCourses,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  } = useCourseLibrary();
  const { deleteCourse, isDeleting } = useSaveCourse();
  const { role, isManager, isLearner } = useUserRole();
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  
  // Only sme_expert and admin can create courses (not managers)
  const canCreateCourse = role === "sme_expert" || role === "admin";
  
  // Only admins can delete courses
  const canDelete = role === "admin";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </AppSidebar>
    );
  }

  const handleDelete = () => {
    if (courseToDelete) {
      deleteCourse(courseToDelete);
      setCourseToDelete(null);
    }
  };

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{isManager ? "Courses" : "My Courses"}</h1>
            <p className="text-muted-foreground mt-1">
              {allCourses.length} {allCourses.length === 1 ? "course" : "courses"}
            </p>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <Button onClick={() => setAssignmentDialogOpen(true)} className="gap-2">
                <Send className="w-4 h-4" />
                Assign Courses
              </Button>
            )}
            {canCreateCourse && (
              <Button onClick={() => navigate("/courses/create")} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Course
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {role === "learner" ? (
                <>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest First</SelectItem>
              <SelectItem value="updated_at">Recently Updated</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || statusFilter !== "all"
                ? "No courses match your filters"
                : "No courses yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first course by combining modules"}
            </p>
            {!searchQuery && statusFilter === "all" && canCreateCourse && (
              <Button onClick={() => navigate("/courses/create")}>
                Create Course
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={(id) => navigate(`/courses/create?edit=${id}`)}
                onDelete={(id) => setCourseToDelete(id)}
                showActions={canDelete}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Course?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the course. The modules within the course will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <CourseAssignmentFlow
            open={assignmentDialogOpen}
            onOpenChange={setAssignmentDialogOpen}
          />
        </div>
      </div>
    </AppSidebar>
  );
}
