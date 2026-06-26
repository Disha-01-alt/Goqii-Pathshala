import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { useAssessments } from "@/hooks/useAssessments";
import { useCourseAssessments } from "@/hooks/useCourseAssessments";
import { Plus, Trash2, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

interface CourseAssessmentManagerProps {
  courseId: string;
}

export function CourseAssessmentManager({ courseId }: CourseAssessmentManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { assessments } = useAssessments();
  const { 
    courseAssessments, 
    isLoading, 
    addAssessmentToCourse, 
    removeAssessmentFromCourse 
  } = useCourseAssessments(courseId);

  const existingAssessmentIds = courseAssessments?.map((ca) => ca.assessment_id) || [];
  const availableAssessments = assessments?.filter(
    (a) => !existingAssessmentIds.includes(a.id)
  );

  const handleAdd = async () => {
    if (!selectedAssessmentId) return;

    await addAssessmentToCourse.mutateAsync({
      assessmentId: selectedAssessmentId,
      dueDate: dueDate || undefined,
    });

    setAddDialogOpen(false);
    setSelectedAssessmentId("");
    setDueDate("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Course Assignments</CardTitle>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Assignment to Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Assignment</Label>
                  <Select
                    value={selectedAssessmentId}
                    onValueChange={setSelectedAssessmentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssessments?.map((assessment) => (
                        <SelectItem key={assessment.id} value={assessment.id}>
                          {assessment.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableAssessments?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No assignments available. Create one first.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Due Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={!selectedAssessmentId || addAssessmentToCourse.isPending}
                  >
                    Add Assignment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : courseAssessments?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No assignments added to this course</p>
            <p className="text-sm">Add assignments for learners to complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courseAssessments?.map((ca, index) => (
              <div
                key={ca.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Badge variant="outline" className="shrink-0">
                  {index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {ca.assessment?.title}
                  </p>
                  {ca.due_date && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {format(new Date(ca.due_date), "MMM d, yyyy h:mm a")}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {ca.assessment?.max_score} pts
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeAssessmentFromCourse.mutate(ca.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
