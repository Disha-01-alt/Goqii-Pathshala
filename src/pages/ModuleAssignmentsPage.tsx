import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronDown, ChevronUp, Target, FileText, ClipboardList, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useModuleAssignments } from "@/hooks/useModuleAssignments";
import { useMyModuleAssignmentSubmissions } from "@/hooks/useModuleAssignmentSubmissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ModuleAssignmentSubmitter } from "@/components/ModuleAssignmentSubmitter";

interface LocationState {
  moduleTitle?: string;
}

export default function ModuleAssignmentsPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const state = location.state as LocationState | null;
  const moduleTitle = state?.moduleTitle || "Module";

  const { data: assignments, isLoading } = useModuleAssignments(moduleId);
  const { submissions, isLoading: subsLoading } = useMyModuleAssignmentSubmissions({
    moduleId,
    courseId,
  });

  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleBackToCourse = () => navigate(`/courses/${courseId}`);
  const toggleInstructions = (id: string) =>
    setExpandedInstructions((p) => ({ ...p, [id]: !p[id] }));

  const subByAssignment = useMemo(() => {
    const map = new Map<string, any>();
    submissions.forEach((s) => map.set(s.module_assignment_id, s));
    return map;
  }, [submissions]);

  const allSubmitted = useMemo(() => {
    if (!assignments || assignments.length === 0) return false;
    return assignments.every((a: any) => {
      const s = subByAssignment.get(a.id);
      return s && (s.status === "submitted" || s.status === "graded");
    });
  }, [assignments, subByAssignment]);

  if (authLoading || isLoading || subsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card/50 px-4 py-3">
          <div className="container mx-auto"><Skeleton className="h-8 w-48" /></div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card/50 px-4 py-3">
          <div className="container mx-auto flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackToCourse} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Course
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-16 text-center">
          <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">No Assignments</h1>
          <p className="text-muted-foreground mb-6">This module doesn't have any assignments.</p>
          <Button onClick={handleBackToCourse}>Return to Course</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 px-4 py-3">
        <div className="container mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToCourse} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Button>
          <span className="text-sm text-muted-foreground">Assignments: {moduleTitle}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Module Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Complete the following {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} to finish this module.
          </p>
        </div>

        <div className="space-y-4">
          {assignments.map((assignment: any, index: number) => {
            const sub = subByAssignment.get(assignment.id);
            const status = (sub?.status as any) || "not_submitted";
            return (
              <Card key={assignment.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignment.goal && (
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Goal</p>
                        <p className="text-sm">{assignment.goal}</p>
                      </div>
                    </div>
                  )}

                  {assignment.instructions && (
                    <Collapsible
                      open={expandedInstructions[assignment.id]}
                      onOpenChange={() => toggleInstructions(assignment.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">Instructions</span>
                          </div>
                          {expandedInstructions[assignment.id] ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {assignment.expected_output && (
                    <div className="flex items-start gap-3">
                      <ClipboardList className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Expected Output</p>
                        <p className="text-sm">{assignment.expected_output}</p>
                      </div>
                    </div>
                  )}

                  {courseId && moduleId && (
                    <ModuleAssignmentSubmitter
                      moduleAssignmentId={assignment.id}
                      moduleId={moduleId}
                      courseId={courseId}
                      status={status}
                      existingResponseText={sub?.response_text}
                      existingFiles={sub?.submitted_files}
                      managerComments={sub?.manager_comments}
                      score={sub?.score}
                      maxScore={sub?.max_score}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          {allSubmitted && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
              <CheckCircle2 className="w-4 h-4" />
              All assignments submitted
            </div>
          )}
          <Button onClick={handleBackToCourse} size="lg">Continue to Course</Button>
        </div>
      </div>
    </div>
  );
}
