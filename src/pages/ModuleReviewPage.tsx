import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModuleApproval } from "@/hooks/useModuleApproval";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  FileText,
  Presentation,
  HelpCircle,
  ClipboardList,
  ChevronDown,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import PPTPreview from "@/components/forge/PPTPreview";
import ArticlePreview from "@/components/forge/ArticlePreview";
import DocumentPreview from "@/components/forge/DocumentPreview";
import VideoPreview from "@/components/forge/VideoPreview";
import ModuleRouter from "@/components/ModuleRouter";

export default function ModuleReviewPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSMEExpert, isAdmin, loading: roleLoading } = useUserRole();
  const { approveModule, rejectModule, isApproving, isRejecting } = useModuleApproval();
  const [reviewNotes, setReviewNotes] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [quizOpen, setQuizOpen] = useState(true);
  const [assignmentsOpen, setAssignmentsOpen] = useState(true);

  // Fetch the module
  const { data: module, isLoading } = useQuery({
    queryKey: ["module-review", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("id", moduleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId && !!user,
  });

  // Redirect if not authorized
  useEffect(() => {
    if (!roleLoading && !isSMEExpert && !isAdmin) {
      navigate("/");
    }
  }, [roleLoading, isSMEExpert, isAdmin, navigate]);

  const handleApprove = () => {
    if (moduleId) {
      approveModule({ moduleId, notes: reviewNotes || undefined });
      navigate("/sme-expert");
    }
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      return;
    }
    if (moduleId) {
      rejectModule({ moduleId, notes: reviewNotes });
      navigate("/sme-expert");
    }
  };

  const renderPreview = () => {
    const slides = module?.slides as any;
    const formattedOutput = module?.formatted_output as any;

    // Check for uploaded file-based content (video, document, ppt, pdf)
    if (slides?.fileUrl) {
      const moduleData = {
        title: module.title,
        fileUrl: slides.fileUrl,
        fileName: slides.fileName,
        type: slides.type || module.module_type,
        quiz: slides.quiz,
      };

      return (
        <ModuleRouter
          module={moduleData}
          moduleType={slides.type || module.module_type}
          savedModuleId={module.id}
        />
      );
    }

    // Check for AI-generated formatted content
    if (formattedOutput) {
      const type = formattedOutput?.type || module.module_type;
      switch (type) {
        case "PPT":
          return <PPTPreview content={formattedOutput?.content || formattedOutput} />;
        case "Article":
          return <ArticlePreview content={formattedOutput?.content || formattedOutput} />;
        case "Document":
          return <DocumentPreview content={formattedOutput?.content || formattedOutput} />;
        case "Video":
          return <VideoPreview content={formattedOutput?.content || formattedOutput} />;
      }
    }

    // Fallback - no content available
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No preview content available</p>
      </div>
    );
  };

  // Get quiz data from either location (quiz_data for AI-generated, slides.quiz for uploads)
  const slides = module?.slides as any;
  const quizDataFromDb = module?.quiz_data as any;
  const quizFromSlides = slides?.quiz;
  const quizQuestions = quizDataFromDb?.questions || quizFromSlides || [];
  
  const assignmentData = module?.assignment_data as any;
  const creator = module?.profiles as { id: string; full_name: string | null; email: string } | null;

  if (isLoading || roleLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppSidebar>
    );
  }

  if (!module) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Module not found</h2>
            <Button onClick={() => navigate("/sme-expert")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AppSidebar>
    );
  }

  const isPending = module.approval_status === "pending_review";

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Back button */}
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sme-expert")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Reviews
            </Button>
          </div>

          {/* Module Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{module.title}</CardTitle>
                  {module.description && (
                    <p className="text-muted-foreground mt-2">{module.description}</p>
                  )}
                </div>
                <Badge
                  variant={isPending ? "default" : module.approval_status === "approved" ? "default" : "destructive"}
                  className={isPending ? "bg-amber-500" : ""}
                >
                  {module.approval_status?.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Presentation className="h-4 w-4" />
                  <span>{module.module_type}</span>
                </div>
                {creator && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{creator.full_name || creator.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Submitted {format(new Date(module.submitted_for_review_at || module.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Preview */}
          <Collapsible open={previewOpen} onOpenChange={setPreviewOpen} className="mb-6">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Content Preview</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${previewOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {renderPreview()}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Quiz Questions */}
          {quizQuestions && quizQuestions.length > 0 && (
            <Collapsible open={quizOpen} onOpenChange={setQuizOpen} className="mb-6">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          Quiz Questions ({quizQuestions.length})
                        </CardTitle>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${quizOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {quizQuestions.map((q: any, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium mb-2">
                            {idx + 1}. {q.question}
                          </p>
                          {q.options && (
                            <div className="ml-4 space-y-1">
                              {q.options.map((opt: string, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className={`text-sm ${
                                    opt === q.correctAnswer
                                      ? "text-green-600 font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}. {opt}
                                  {opt === q.correctAnswer && " ✓"}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.explanation && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              Explanation: {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Assignments */}
          {assignmentData?.assignments && assignmentData.assignments.length > 0 && (
            <Collapsible open={assignmentsOpen} onOpenChange={setAssignmentsOpen} className="mb-6">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          Assignments ({assignmentData.assignments.length})
                        </CardTitle>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${assignmentsOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {assignmentData.assignments.map((a: any, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-medium mb-1">{a.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                          {a.instructions && (
                            <p className="text-sm">{a.instructions}</p>
                          )}
                          {a.dueInDays && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Due: {a.dueInDays} days after assignment
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Review Actions */}
          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Review Notes {!reviewNotes.trim() && "(required for rejection)"}
                    </label>
                    <Textarea
                      placeholder="Add notes about your review decision..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Separator />
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isRejecting || !reviewNotes.trim()}
                      className="gap-2"
                    >
                      {isRejecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {isApproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve & Publish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppSidebar>
  );
}
