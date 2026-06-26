import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Presentation, BookOpen, Video, HelpCircle, User, Calendar, Check, X, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PendingModule } from "@/hooks/useModuleApproval";

interface ModuleApprovalCardProps {
  module: PendingModule;
  onApprove: (moduleId: string, notes?: string) => void;
  onReject: (moduleId: string, notes: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

const moduleTypeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  document: { label: "Document", icon: FileText },
  presentation: { label: "Presentation", icon: Presentation },
  textbook: { label: "Textbook", icon: BookOpen },
  video: { label: "Video", icon: Video },
  quiz: { label: "Quiz", icon: HelpCircle },
};

export function ModuleApprovalCard({ module, onApprove, onReject, isApproving, isRejecting }: ModuleApprovalCardProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approveNotes, setApproveNotes] = useState("");

  const TypeIcon = moduleTypeConfig[module.module_type]?.icon || FileText;
  const typeLabel = moduleTypeConfig[module.module_type]?.label || "Module";

  const handleApprove = () => {
    onApprove(module.id, approveNotes || undefined);
  };

  const handleReject = () => {
    if (!rejectNotes.trim()) return;
    onReject(module.id, rejectNotes);
    setShowRejectForm(false);
    setRejectNotes("");
  };

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
        <Badge variant="secondary" className="text-xs shrink-0">{typeLabel}</Badge>
      </div>

      {/* Metadata - Creator Info */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
        {module.creator && (
          <span className="flex items-center gap-1" title="Created by Module Designer">
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium text-foreground">Created by:</span>
            <span className="text-foreground/80">
              {module.creator.full_name || module.creator.email}
            </span>
          </span>
        )}
        {module.submitted_for_review_at && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Submitted: {format(new Date(module.submitted_for_review_at), "MMM d, yyyy")}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Link to={`/sme-expert/review/${module.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Button>
        </Link>
        
        {!showRejectForm ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRejectForm(true)}
              disabled={isApproving || isRejecting}
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
            <Button 
              size="sm" 
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              Approve
            </Button>
          </>
        ) : (
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Reason for rejection (required)..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRejectForm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleReject}
                disabled={!rejectNotes.trim() || isRejecting}
              >
                {isRejecting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}