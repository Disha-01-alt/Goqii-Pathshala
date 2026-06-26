import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCourseLibrary, Course } from "@/hooks/useCourseLibrary";
import { useLearners, Learner } from "@/hooks/useLearners";
import { useCourseAssignments } from "@/hooks/useCourseAssignments";
import { BookOpen, Users, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";

interface CourseAssignmentFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseAssignmentFlow({ open, onOpenChange }: CourseAssignmentFlowProps) {
  const [step, setStep] = useState<"courses" | "learners" | "done">("courses");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);

  const { allCourses, isLoading: coursesLoading } = useCourseLibrary();
  const { learners, isLoading: learnersLoading } = useLearners();
  const { assignCourses, isAssigning } = useCourseAssignments();

  // Filter to only show published courses
  const publishedCourses = allCourses.filter((c) => c.is_published);

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleLearnerToggle = (learnerId: string) => {
    setSelectedLearnerIds((prev) =>
      prev.includes(learnerId)
        ? prev.filter((id) => id !== learnerId)
        : [...prev, learnerId]
    );
  };

  const handleSelectAllCourses = () => {
    if (selectedCourseIds.length === publishedCourses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(publishedCourses.map((c) => c.id));
    }
  };

  const handleSelectAllLearners = () => {
    if (selectedLearnerIds.length === learners.length) {
      setSelectedLearnerIds([]);
    } else {
      setSelectedLearnerIds(learners.map((l) => l.id));
    }
  };

  const handleAssign = async () => {
    await assignCourses({
      courseIds: selectedCourseIds,
      learnerIds: selectedLearnerIds,
    });
    setStep("done");
  };

  const handleClose = () => {
    setStep("courses");
    setSelectedCourseIds([]);
    setSelectedLearnerIds([]);
    onOpenChange(false);
  };

  const allCoursesSelected = selectedCourseIds.length === publishedCourses.length && publishedCourses.length > 0;
  const allLearnersSelected = selectedLearnerIds.length === learners.length && learners.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === "courses" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Select Courses
              </DialogTitle>
              <DialogDescription>
                Choose the courses you want to assign to learners
              </DialogDescription>
            </DialogHeader>

            {coursesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : publishedCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No published courses available
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    id="select-all-courses"
                    checked={allCoursesSelected}
                    onCheckedChange={handleSelectAllCourses}
                  />
                  <label
                    htmlFor="select-all-courses"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All ({publishedCourses.length})
                  </label>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {publishedCourses.map((course) => (
                      <CourseItem
                        key={course.id}
                        course={course}
                        selected={selectedCourseIds.includes(course.id)}
                        onToggle={() => handleCourseToggle(course.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("learners")}
                disabled={selectedCourseIds.length === 0}
              >
                Next: Select Learners
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "learners" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Select Learners
              </DialogTitle>
              <DialogDescription>
                {selectedCourseIds.length} course(s) selected. Choose learners to assign.
              </DialogDescription>
            </DialogHeader>

            {learnersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : learners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No learners available
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    id="select-all-learners"
                    checked={allLearnersSelected}
                    onCheckedChange={handleSelectAllLearners}
                  />
                  <label
                    htmlFor="select-all-learners"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All ({learners.length})
                  </label>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {learners.map((learner) => (
                      <LearnerItem
                        key={learner.id}
                        learner={learner}
                        selected={selectedLearnerIds.includes(learner.id)}
                        onToggle={() => handleLearnerToggle(learner.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("courses")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleAssign}
                disabled={selectedLearnerIds.length === 0 || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Done
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[hsl(var(--success))]">
                <Check className="h-5 w-5" />
                Courses Assigned
              </DialogTitle>
              <DialogDescription>
                Successfully assigned {selectedCourseIds.length} course(s) to{" "}
                {selectedLearnerIds.length} learner(s).
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 mb-4">
                <Check className="h-8 w-8 text-[hsl(var(--success))]" />
              </div>
              <p className="text-sm text-muted-foreground">
                The selected learners now have access to the assigned courses.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CourseItem({
  course,
  selected,
  onToggle,
}: {
  course: Course;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
      }`}
      onClick={onToggle}
    >
      <Checkbox 
        checked={selected} 
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => onToggle()} 
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{course.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {course.course_modules?.length || 0} modules
        </p>
      </div>
    </div>
  );
}

function LearnerItem({
  learner,
  selected,
  onToggle,
}: {
  learner: Learner;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
      }`}
      onClick={onToggle}
    >
      <Checkbox 
        checked={selected} 
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => onToggle()} 
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {learner.full_name || learner.email}
        </p>
        <p className="text-xs text-muted-foreground truncate">{learner.email}</p>
      </div>
    </div>
  );
}
