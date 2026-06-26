import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllSubmissions, AssessmentSubmission } from "@/hooks/useAssessmentSubmissions";
import { SubmissionReviewer } from "./SubmissionReviewer";
import { formatDistanceToNow } from "date-fns";
import { FileText, User, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function PendingSubmissionsCard() {
  const { pendingSubmissions, isLoading } = useAllSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Pending Reviews
              {pendingSubmissions.length > 0 && (
                <Badge variant="destructive">{pendingSubmissions.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions pending review
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {submission.assessment?.title}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {submission.user?.full_name || submission.user?.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {submission.submitted_at &&
                          formatDistanceToNow(new Date(submission.submitted_at), {
                            addSuffix: true,
                          })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}

              {pendingSubmissions.length > 5 && (
                <Button variant="ghost" className="w-full">
                  View all {pendingSubmissions.length} submissions
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSubmission && (
        <SubmissionReviewer
          submission={selectedSubmission}
          open={!!selectedSubmission}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
        />
      )}
    </>
  );
}
