import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Presentation, 
  BookOpen, 
  Video, 
  HelpCircle, 
  User, 
  Calendar, 
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { ReviewedModule } from "@/hooks/useModuleApproval";

interface ReviewedModuleCardProps {
  module: ReviewedModule;
}

const moduleTypeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  document: { label: "Document", icon: FileText },
  presentation: { label: "Presentation", icon: Presentation },
  textbook: { label: "Textbook", icon: BookOpen },
  video: { label: "Video", icon: Video },
  quiz: { label: "Quiz", icon: HelpCircle },
};

export function ReviewedModuleCard({ module }: ReviewedModuleCardProps) {
  const TypeIcon = moduleTypeConfig[module.module_type]?.icon || FileText;
  const typeLabel = moduleTypeConfig[module.module_type]?.label || "Module";
  const isApproved = module.approval_status === "approved";

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-muted rounded-md">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{module.title}</h3>
          {module.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{module.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <Badge 
            variant={isApproved ? "default" : "destructive"} 
            className={`text-xs ${isApproved ? "bg-green-600" : ""}`}
          >
            {isApproved ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Approved</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
            )}
          </Badge>
          <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
        </div>
      </div>

      {/* Metadata - Creator and Reviewer */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {module.creator && (
          <span className="flex items-center gap-1" title="Created by Module Designer">
            <User className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-foreground/80">Designer:</span>
            {module.creator.full_name || module.creator.email}
          </span>
        )}
        {module.reviewer && (
          <span className="flex items-center gap-1" title="Reviewed by SME">
            <UserCheck className="h-3 w-3 text-green-500" />
            <span className="font-medium text-foreground/80">Reviewer:</span>
            {module.reviewer.full_name || module.reviewer.email}
          </span>
        )}
        {module.reviewed_at && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Reviewed: {format(new Date(module.reviewed_at), "MMM d, yyyy")}
            <span className="text-muted-foreground/60">
              ({formatDistanceToNow(new Date(module.reviewed_at), { addSuffix: true })})
            </span>
          </span>
        )}
      </div>

      {/* Review Notes */}
      {module.review_notes && (
        <div className="bg-muted/50 rounded-md p-2 text-sm">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MessageSquare className="h-3 w-3" />
            Review Notes
          </div>
          <p className="text-foreground text-xs">{module.review_notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Link to={`/library/${module.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View Module
          </Button>
        </Link>
      </div>
    </Card>
  );
}
