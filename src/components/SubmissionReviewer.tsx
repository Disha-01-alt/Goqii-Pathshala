import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssessmentSubmission, useAllSubmissions } from "@/hooks/useAssessmentSubmissions";
import { formatDistanceToNow } from "date-fns";
import { FileText, ExternalLink, User, Clock, CheckCircle } from "lucide-react";

interface SubmissionReviewerProps {
  submission: AssessmentSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionReviewer({
  submission,
  open,
  onOpenChange,
}: SubmissionReviewerProps) {
  const [score, setScore] = useState(submission.score?.toString() || "");
  const [comments, setComments] = useState(submission.manager_comments || "");
  const [needsRevision, setNeedsRevision] = useState(false);

  const { gradeSubmission } = useAllSubmissions();

  const handleGrade = async () => {
    const numScore = parseInt(score);
    if (isNaN(numScore) || numScore < 0 || numScore > submission.max_score) {
      return;
    }

    await gradeSubmission.mutateAsync({
      submissionId: submission.id,
      score: numScore,
      comments: comments || undefined,
      status: needsRevision ? "needs_revision" : "graded",
    });

    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-amber-100 text-amber-800";
      case "graded":
        return "bg-green-100 text-green-800";
      case "needs_revision":
        return "bg-red-100 text-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{submission.assessment?.title}</span>
                <Badge className={getStatusColor(submission.status)}>
                  {submission.status.replace("_", " ")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{submission.user?.full_name || submission.user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{submission.course?.title}</span>
              </div>
              {submission.submitted_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Submitted{" "}
                    {formatDistanceToNow(new Date(submission.submitted_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Text */}
          {submission.response_text && (
            <div className="space-y-2">
              <Label>Learner's Response</Label>
              <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                {submission.response_text}
              </div>
            </div>
          )}

          {/* Submitted Files */}
          {submission.submitted_files.length > 0 && (
            <div className="space-y-2">
              <Label>Submitted Files</Label>
              <div className="space-y-2">
                {submission.submitted_files.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="flex-1 text-sm">{file.name}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Grading Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Grade Submission
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="score">Score (max {submission.max_score})</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={submission.max_score}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Enter score"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsRevision}
                    onChange={(e) => setNeedsRevision(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Request Revision</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments for Learner</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Provide feedback on the submission..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGrade}
                disabled={!score || gradeSubmission.isPending}
              >
                {gradeSubmission.isPending ? "Saving..." : "Submit Grade"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
