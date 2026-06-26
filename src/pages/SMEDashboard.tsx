import { Link, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { useModuleLibrary } from "@/hooks/useModuleLibrary";
import { useModuleApproval } from "@/hooks/useModuleApproval";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChartCard, PieChartData } from "@/components/PieChartCard";
import { 
  Sparkles, 
  Library, 
  FolderOpen,
  FileText,
  Presentation,
  Loader2,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Settings
} from "lucide-react";
import { useMemo } from "react";

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

export default function SMEDashboard() {
  const navigate = useNavigate();
  const { modules, isLoading } = useModuleLibrary();
  const { user } = useAuth();
  const { isLoadingMyModules } = useModuleApproval();

  // Filter to only show user's own modules for stats
  const myModules = useMemo(() => {
    return modules.filter((m) => m.user_id === user?.id);
  }, [modules, user?.id]);

  // Categorize modules by status
  const pendingModules = useMemo(() => {
    return myModules.filter(m => m.approval_status === "pending_review");
  }, [myModules]);

  const approvedModules = useMemo(() => {
    return myModules.filter(m => m.approval_status === "approved");
  }, [myModules]);

  const rejectedModules = useMemo(() => {
    return myModules.filter(m => m.approval_status === "rejected");
  }, [myModules]);

  // Categorize by type
  const presentationModules = myModules.filter((m) => m.module_type === "presentation");
  const documentModules = myModules.filter((m) => m.module_type === "document");
  const textbookModules = myModules.filter((m) => m.module_type === "textbook");
  const otherModules = myModules.filter((m) => 
    !["presentation", "document", "textbook"].includes(m.module_type)
  );

  // Prepare status data for pie chart
  const statusData: PieChartData[] = [
    { name: "Pending", value: pendingModules.length, color: CHART_COLORS.pending },
    { name: "Approved", value: approvedModules.length, color: CHART_COLORS.approved },
    { name: "Rejected", value: rejectedModules.length, color: CHART_COLORS.rejected },
  ];

  // Prepare type data for pie chart
  const typeData: PieChartData[] = [
    { name: "Presentations", value: presentationModules.length, color: CHART_COLORS.presentation },
    { name: "Documents", value: documentModules.length, color: CHART_COLORS.document },
    { name: "Textbooks", value: textbookModules.length, color: CHART_COLORS.textbook },
  ];
  if (otherModules.length > 0) {
    typeData.push({ name: "Other", value: otherModules.length, color: CHART_COLORS.other });
  }

  if (isLoading || isLoadingMyModules) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your dashboard...</p>
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
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome, {user?.user_metadata?.full_name || "Module Designer"}!
                </h1>
                <p className="text-xs text-muted-foreground">Create and manage your learning modules</p>
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">My Modules</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{myModules.length}</p>
            </Card>
            <Card className={`p-3 ${pendingModules.length > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${pendingModules.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${pendingModules.length > 0 ? "text-amber-600" : "text-foreground"}`}>
                {pendingModules.length}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Approved</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{approvedModules.length}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{rejectedModules.length}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Presentation className="h-4 w-4 text-secondary" />
                <span className="text-xs text-muted-foreground">Presentations</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{presentationModules.length}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-xs text-muted-foreground">Documents</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{documentModules.length}</p>
            </Card>
          </div>

          {/* Main Content - Side by Side Pie Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-4">
                <PieChartCard
                  title="Modules by Status"
                  icon={FolderOpen}
                  data={statusData}
                  centerLabel="Total"
                  centerValue={myModules.length}
                  emptyMessage="No modules created yet"
                />
                <PieChartCard
                  title="Modules by Type"
                  icon={FileText}
                  data={typeData}
                  centerLabel="Types"
                  centerValue={myModules.length}
                  emptyMessage="No modules created yet"
                />
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Quick Actions</h3>
                  </div>
                  <div className="space-y-2">
                    <Link
                      to="/create"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Create Module</p>
                        <p className="text-xs text-muted-foreground truncate">Start a new module</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/my-modules"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <FolderOpen className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">My Modules</p>
                        <p className="text-xs text-muted-foreground truncate">View your modules</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/library"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-[hsl(var(--success))]/10 rounded-md">
                        <Library className="h-4 w-4 text-[hsl(var(--success))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">All Modules</p>
                        <p className="text-xs text-muted-foreground truncate">Browse module library</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-accent/10 rounded-md">
                        <Settings className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Settings</p>
                        <p className="text-xs text-muted-foreground truncate">AI & preferences</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
