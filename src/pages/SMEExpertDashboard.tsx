import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useModuleApproval, PendingModule } from "@/hooks/useModuleApproval";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PieChartCard, PieChartData } from "@/components/PieChartCard";
import { ModuleApprovalCard } from "@/components/ModuleApprovalCard";
import { 
  FileCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Library, 
  Settings,
  Loader2,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Presentation,
  FileText
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { AppSidebar } from "@/components/AppSidebar";

// Chart colors
const CHART_COLORS = {
  pending: "hsl(38, 92%, 50%)",     // Amber
  approved: "hsl(142, 70%, 35%)",   // Green
  rejected: "hsl(0, 84%, 60%)",     // Red
  presentation: "hsl(262, 83%, 58%)", // Purple
  document: "hsl(142, 60%, 50%)",   // Light green
  textbook: "hsl(199, 89%, 48%)",   // Blue
  other: "hsl(220, 9%, 60%)",       // Gray
};

export default function SMEExpertDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSMEExpert, isAdmin, loading: roleLoading } = useUserRole();
  const { 
    pendingModules, 
    isLoadingPending,
    approvedModules,
    isLoadingApproved,
    rejectedModules,
    isLoadingRejected,
    reviewStats,
    approveModule,
    rejectModule,
    isApproving,
    isRejecting
  } = useModuleApproval();

  // Handlers for module approval actions
  const handleApprove = (moduleId: string, notes?: string) => {
    approveModule({ moduleId, notes });
  };

  const handleReject = (moduleId: string, notes: string) => {
    rejectModule({ moduleId, notes });
  };

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isSMEExpert && !isAdmin) {
        navigate("/");
      }
    }
  }, [user, authLoading, roleLoading, isSMEExpert, isAdmin, navigate]);

  // Calculate urgent modules (waiting > 7 days)
  const urgentCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return pendingModules.filter((m: PendingModule) => 
      m.submitted_for_review_at && new Date(m.submitted_for_review_at) < weekAgo
    ).length;
  }, [pendingModules]);

  // Get module types from pending modules
  const moduleTypeStats = useMemo(() => {
    const types: Record<string, number> = {};
    pendingModules.forEach((m: PendingModule) => {
      types[m.module_type] = (types[m.module_type] || 0) + 1;
    });
    return types;
  }, [pendingModules]);

  // Prepare status data for pie chart
  const statusData: PieChartData[] = [
    { name: "Pending", value: pendingModules.length, color: CHART_COLORS.pending },
    { name: "Approved", value: reviewStats?.approved ?? 0, color: CHART_COLORS.approved },
    { name: "Rejected", value: reviewStats?.rejected ?? 0, color: CHART_COLORS.rejected },
  ];

  // Prepare type data for pie chart (from pending modules)
  const typeData: PieChartData[] = [
    { name: "Presentations", value: moduleTypeStats["presentation"] || 0, color: CHART_COLORS.presentation },
    { name: "Documents", value: moduleTypeStats["document"] || 0, color: CHART_COLORS.document },
    { name: "Textbooks", value: moduleTypeStats["textbook"] || 0, color: CHART_COLORS.textbook },
  ];
  const otherCount = Object.entries(moduleTypeStats)
    .filter(([type]) => !["presentation", "document", "textbook"].includes(type))
    .reduce((sum, [, count]) => sum + count, 0);
  if (otherCount > 0) {
    typeData.push({ name: "Other", value: otherCount, color: CHART_COLORS.other });
  }

  if (authLoading || roleLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome, {user?.user_metadata?.full_name || "SME"}!
                </h1>
                <p className="text-xs text-muted-foreground">Review and approve modules from Module Designers</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/library")}>
                <Library className="mr-1.5 h-4 w-4" />
                Library
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoadingPending ? <Loader2 className="h-5 w-5 animate-spin" /> : pendingModules.length}
              </p>
            </Card>
            <Card className={`p-3 ${urgentCount > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${urgentCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">Urgent</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${urgentCount > 0 ? "text-amber-600" : "text-foreground"}`}>
                {urgentCount}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Approved</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reviewStats?.approved ?? "-"}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reviewStats?.rejected ?? "-"}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reviewStats?.reviewedToday ?? "-"}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">This Week</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reviewStats?.reviewedThisWeek ?? "-"}
              </p>
            </Card>
          </div>

          {/* Main Content - Side by Side Pie Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-4">
                <PieChartCard
                  title="Review Status"
                  icon={FileCheck}
                  data={statusData}
                  centerLabel="Total"
                  centerValue={pendingModules.length + (reviewStats?.approved ?? 0) + (reviewStats?.rejected ?? 0)}
                  emptyMessage="No modules to review"
                />
                <PieChartCard
                  title="Pending by Type"
                  icon={FileText}
                  data={typeData}
                  centerLabel="Pending"
                  centerValue={pendingModules.length}
                  emptyMessage="No pending modules"
                />
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Quick Actions</h3>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate("/sme-expert")}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group text-left"
                    >
                      <div className="p-1.5 bg-amber-500/10 rounded-md">
                        <Clock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Review Pending</p>
                        <p className="text-xs text-muted-foreground truncate">{pendingModules.length} modules waiting</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={() => navigate("/library")}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group text-left"
                    >
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Library className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Module Library</p>
                        <p className="text-xs text-muted-foreground truncate">Browse all modules</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={() => navigate("/library")}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group text-left"
                    >
                      <div className="p-1.5 bg-green-500/10 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Approved Modules</p>
                        <p className="text-xs text-muted-foreground truncate">{reviewStats?.approved ?? 0} approved</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={() => navigate("/settings")}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group text-left"
                    >
                      <div className="p-1.5 bg-accent/10 rounded-md">
                        <Settings className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Settings</p>
                        <p className="text-xs text-muted-foreground truncate">Preferences</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pending Modules Section */}
          <div className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-semibold">Pending Modules</h2>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {pendingModules.length} awaiting review
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPending ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingModules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>All caught up! No modules pending review.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingModules.map((module) => (
                      <ModuleApprovalCard
                        key={module.id}
                        module={module}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isApproving={isApproving}
                        isRejecting={isRejecting}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
