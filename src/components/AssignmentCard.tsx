import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Send, Eye, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type AssignmentStatus = "not_submitted" | "pending_review" | "submitted" | "graded" | "needs_revision";

interface SubmittedFile {
  name: string;
  url: string;
}

interface AssignmentCardProps {
  id: string;
  assessmentId?: string;
  courseId?: string;
  title: string;
  description: string | null;
  courseName: string;
  dueDate?: Date | null;
  status: AssignmentStatus;
  grade?: number;
  submittedFiles?: SubmittedFile[];
  managerComments?: string;
  onAction?: () => void;
}

const statusConfig: Record<AssignmentStatus, {
  label: string;
  className: string;
  icon: typeof Clock;
}> = {
  not_submitted: {
    label: "Not Submitted",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  },
  submitted: {
    label: "Pending Review",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  pending_review: {
    label: "Pending Review",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  graded: {
    label: "Graded",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: Eye,
  },
  needs_revision: {
    label: "Needs Revision",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
  },
};

export function AssignmentCard({
  id,
  assessmentId,
  courseId,
  title,
  description,
  courseName,
  dueDate,
  status,
  grade,
  submittedFiles,
  managerComments,
  onAction,
}: AssignmentCardProps) {
  const navigate = useNavigate();
  const isGradedOrRevision = status === "graded" || status === "needs_revision";
  const [isExpanded, setIsExpanded] = useState(isGradedOrRevision);
  const config = statusConfig[status] || statusConfig.not_submitted;
  const isOverdue = dueDate && isPast(dueDate) && status === "not_submitted";
  const isDueToday = dueDate && isToday(dueDate);
  const hasDetails = (submittedFiles && submittedFiles.length > 0) || managerComments || (status === "graded" && grade !== undefined);

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (courseId && assessmentId) {
      // Navigate to CourseViewer with assessment state
      navigate(`/courses/${courseId}`, { 
        state: { assessmentId } 
      });
    }
  };

  const getActionButton = () => {
    switch (status) {
      case "not_submitted":
        return { label: "Submit Assignment", icon: Send, variant: "default" as const };
      case "submitted":
      case "pending_review":
        return { label: "View Submission", icon: Eye, variant: "outline" as const };
      case "graded":
        return { label: "View Feedback", icon: FileText, variant: "outline" as const };
      case "needs_revision":
        return { label: "Revise & Resubmit", icon: Send, variant: "destructive" as const };
      default:
        return { label: "View", icon: Eye, variant: "outline" as const };
    }
  };

  const actionConfig = getActionButton();
  const StatusIcon = config.icon;

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isOverdue && "border-destructive/50 bg-destructive/5"
    )}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Left Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-base">{title}</h3>
                <Badge variant="secondary" className={cn("text-xs", config.className)}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              
              {/* Course Name */}
              <p className="text-sm text-primary font-medium mb-2">{courseName}</p>
              
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {description}
                </p>
              )}

              {/* Due Date */}
              {dueDate && (
                <div className={cn(
                  "flex items-center gap-2 text-sm",
                  isOverdue && "text-destructive font-medium",
                  isDueToday && "text-secondary font-medium",
                  !isOverdue && !isDueToday && "text-muted-foreground"
                )}>
                  <Calendar className="h-4 w-4" />
                  <span>
                    {isOverdue ? "Overdue: " : isDueToday ? "Due Today: " : "Due: "}
                    {format(dueDate, "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button 
              variant={actionConfig.variant} 
              size="sm" 
              className="gap-2 shrink-0"
              onClick={handleAction}
            >
              <actionConfig.icon className="h-4 w-4" />
              {actionConfig.label}
            </Button>
          </div>

          {/* Expandable Details Section */}
          {hasDetails && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <span className="text-xs">
                    {isExpanded ? "Hide Details" : "Show Details"}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Submitted Files */}
                {submittedFiles && submittedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Paperclip className="h-4 w-4" />
                      <span>Submitted Files</span>
                    </div>
                    <div className="space-y-1 pl-6">
                      {submittedFiles.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline"
                        >
                          {file.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manager Comments */}
                {managerComments && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>Manager Feedback</span>
                    </div>
                    <div className="pl-6 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {managerComments}
                      </p>
                    </div>
                  </div>
                )}

                {/* Grade Display */}
                {status === "graded" && grade !== undefined && (
                  <div className="flex items-center gap-3 pl-6">
                    <span className="text-sm font-medium text-foreground">Score:</span>
                    <span className={cn(
                      "font-bold text-xl",
                      grade >= 70 ? "text-[hsl(var(--success))]" : "text-destructive"
                    )}>
                      {grade}%
                    </span>
                    <Badge variant={grade >= 70 ? "default" : "destructive"}>
                      {grade >= 70 ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
