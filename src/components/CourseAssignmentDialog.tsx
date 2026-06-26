import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCourseLibrary } from "@/hooks/useCourseLibrary";
import { useCourseAssessments } from "@/hooks/useCourseAssessments";
import { Plus, Loader2, Check } from "lucide-react";

interface CourseAssignmentDialogProps {
  assessmentId: string;
  assessmentTitle: string;
  trigger?: React.ReactNode;
  onAssigned?: () => void;
}

export function CourseAssignmentDialog({
  assessmentId,
  assessmentTitle,
  trigger,
  onAssigned,
}: CourseAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { courses } = useCourseLibrary();
  const { addAssessmentToCourse } = useCourseAssessments(selectedCourseId);

  // Fetch all course_assessments for this assessment to know which courses already have it
  const { data: linkedCourseIds = [] } = useQuery({
    queryKey: ["assessment-linked-courses", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_assessments")
        .select("course_id")
        .eq("assessment_id", assessmentId);
      
      if (error) throw error;
      return data.map((ca) => ca.course_id);
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Filter out courses that already have this assessment linked
  const availableCourses = useMemo(() => {
    return courses.filter((course) => !linkedCourseIds.includes(course.id));
  }, [courses, linkedCourseIds]);

  const handleAssign = async () => {
    if (!selectedCourseId) return;

    setIsSubmitting(true);
    try {
      await addAssessmentToCourse.mutateAsync({
        assessmentId,
        dueDate: dueDate || undefined,
      });
      setOpen(false);
      setSelectedCourseId("");
      setDueDate("");
      onAssigned?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Link to Course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Assignment to Course</DialogTitle>
          <DialogDescription>
            Add "{assessmentTitle}" to a course. Learners enrolled in that course will see this assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="course">Select Course</Label>
            {availableCourses.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-md">
                <Check className="h-4 w-4 text-green-500" />
                This assignment is already linked to all available courses.
              </div>
            ) : (
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedCourseId || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Link to Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
