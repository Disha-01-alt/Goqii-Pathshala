import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileCheck, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useModuleApproval } from "@/hooks/useModuleApproval";

interface PendingApprovalWidgetProps {
  role: "sme" | "sme_expert";
}

export function PendingApprovalWidget({ role }: PendingApprovalWidgetProps) {
  const { pendingModules, isLoadingPending, myModulesStatus, isLoadingMyModules } = useModuleApproval();

  if (role === "sme_expert") {
    // SME (formerly SME Expert) sees pending modules to review
    const pendingCount = pendingModules.length;

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Pending Reviews</h3>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        {isLoadingPending ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pendingCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No modules awaiting review
          </p>
        ) : (
          <div className="space-y-2">
            {pendingModules.slice(0, 3).map((module) => (
              <div key={module.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 text-foreground">{module.title}</span>
              </div>
            ))}
            {pendingCount > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{pendingCount - 3} more
              </p>
            )}
            <Link to="/sme-expert/reviews">
              <Button size="sm" className="w-full mt-2">
                Review All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </Card>
    );
  }

  // Module Designer (formerly SME) sees their own modules' status
  const pendingReview = myModulesStatus.filter(m => m.approval_status === "pending_review");
  const rejected = myModulesStatus.filter(m => m.approval_status === "rejected");
  const approved = myModulesStatus.filter(m => m.approval_status === "approved");
  const drafts = myModulesStatus.filter(m => m.approval_status === "draft");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Module Status</h3>
        </div>
      </div>

      {isLoadingMyModules ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : myModulesStatus.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No modules created yet
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-md">
              <p className="text-lg font-bold text-foreground">{drafts.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Drafts</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-md">
              <p className="text-lg font-bold text-amber-600">{pendingReview.length}</p>
              <p className="text-[10px] text-amber-600 uppercase">Pending</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-md">
              <p className="text-lg font-bold text-green-600">{approved.length}</p>
              <p className="text-[10px] text-green-600 uppercase">Approved</p>
            </div>
            <div className="p-2 bg-destructive/10 rounded-md">
              <p className="text-lg font-bold text-destructive">{rejected.length}</p>
              <p className="text-[10px] text-destructive uppercase">Rejected</p>
            </div>
          </div>
          
          {rejected.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-destructive font-medium mb-1">Needs attention:</p>
              {rejected.slice(0, 2).map((module) => (
                <Link 
                  key={module.id} 
                  to={`/library/${module.id}`}
                  className="block text-xs text-muted-foreground hover:text-foreground truncate"
                >
                  • {module.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}