import { useState } from "react";
import { Link } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AssessmentBuilder } from "@/components/AssessmentBuilder";
import { CourseAssignmentDialog } from "@/components/CourseAssignmentDialog";
import { useAssessments } from "@/hooks/useAssessments";
import { useCourseLibrary } from "@/hooks/useCourseLibrary";
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Trash2, 
  BookOpen,
  Clock,
  Link as LinkIcon
} from "lucide-react";
import { format } from "date-fns";
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

export default function AssessmentManagement() {
  const { assessments, isLoading, deleteAssessment } = useAssessments();
  const { allCourses } = useCourseLibrary();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredAssessments = assessments?.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Find which courses use each assessment
  const getCoursesUsingAssessment = (assessmentId: string) => {
    return allCourses.filter((course) =>
      course.course_assessments?.some((ca: any) => ca.assessment_id === assessmentId)
    );
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAssessment.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
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
        <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/manager">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Assignment Management</h1>
            <p className="text-muted-foreground">
              Create and manage assignments for your courses
            </p>
          </div>
          <AssessmentBuilder />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Assessments List */}
        <div className="space-y-4">
          {filteredAssessments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No assignments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first assignment to evaluate learner progress
                </p>
                <AssessmentBuilder />
              </CardContent>
            </Card>
          ) : (
            filteredAssessments.map((assessment) => {
              const linkedCourses = getCoursesUsingAssessment(assessment.id);
              
              return (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{assessment.title}</h3>
                          <Badge variant="outline">
                            Max: {assessment.max_score} pts
                          </Badge>
                        </div>
                        
                        {assessment.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {assessment.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(assessment.created_at), "MMM d, yyyy")}
                          </span>
                        </div>

                        {/* Linked Courses Section */}
                        {linkedCourses.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              Linked to:
                            </span>
                            {linkedCourses.map((course) => (
                              <Badge key={course.id} variant="secondary" className="text-xs">
                                {course.title}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <CourseAssignmentDialog
                          assessmentId={assessment.id}
                          assessmentTitle={assessment.title}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(assessment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this assignment. This action cannot be undone.
                If this assignment is attached to any courses, it will be removed from them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppSidebar>
  );
}
