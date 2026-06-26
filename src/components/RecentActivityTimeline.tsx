import { CheckCircle2, BookOpen, FileText, Trophy, Play, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  type: "course_started" | "course_completed" | "assignment_submitted" | "grade_received" | "module_completed" | "achievement";
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: {
    score?: number;
    courseName?: string;
    moduleName?: string;
  };
}

interface RecentActivityTimelineProps {
  activities: ActivityItem[];
  className?: string;
}

const activityConfig: Record<ActivityItem["type"], {
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
}> = {
  course_started: {
    icon: Play,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  course_completed: {
    icon: CheckCircle2,
    color: "text-[hsl(var(--success))]",
    bgColor: "bg-[hsl(var(--success-bg))]",
  },
  assignment_submitted: {
    icon: FileText,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  grade_received: {
    icon: Trophy,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  module_completed: {
    icon: BookOpen,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  achievement: {
    icon: Award,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
};

export function RecentActivityTimeline({ activities, className }: RecentActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No recent activity yet</p>
        <p className="text-xs">Start a course to see your progress here!</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-4">
            {/* Timeline Indicator */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                config.bgColor
              )}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              {!isLast && (
                <div className="w-0.5 h-full bg-border min-h-[2rem]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 pt-1 flex-1 min-w-0">
              <p className="font-medium text-sm">{activity.title}</p>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activity.description}
                </p>
              )}
              {activity.metadata?.score !== undefined && (
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Score: </span>
                  <span className={cn(
                    "font-semibold",
                    activity.metadata.score >= 70 ? "text-[hsl(var(--success))]" : "text-destructive"
                  )}>
                    {activity.metadata.score}%
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
