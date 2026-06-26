import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { useLearners } from "@/hooks/useLearners";
import { useCourseLibrary } from "@/hooks/useCourseLibrary";
import { useAllSubmissions } from "@/hooks/useAssessmentSubmissions";
import { CourseAssignmentFlow } from "@/components/CourseAssignmentFlow";
import { PendingSubmissionsCard } from "@/components/PendingSubmissionsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChartCard, PieChartData } from "@/components/PieChartCard";
import { 
  Users, 
  BookOpen, 
  ClipboardList,
  UserPlus,
  Loader2,
  ChevronRight,
  BarChart3,
  UserCheck,
  Send
} from "lucide-react";

// Chart colors
const CHART_COLORS = {
  active: "hsl(142, 70%, 35%)",
  inactive: "hsl(220, 9%, 60%)",
  published: "hsl(142, 70%, 35%)",
  draft: "hsl(38, 92%, 50%)",
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  
  const { learners, isLoading: learnersLoading } = useLearners();
  const { courses, isLoading: coursesLoading } = useCourseLibrary();
  const { pendingSubmissions, isLoading: submissionsLoading } = useAllSubmissions();

  const isLoading = learnersLoading || coursesLoading || submissionsLoading;

  // Calculate learner stats
  const activeLearners = learners.filter((l) => l.is_active).length;
  const inactiveLearners = learners.filter((l) => !l.is_active).length;

  // Calculate course stats
  const publishedCourses = courses.filter((c) => c.is_published);
  const draftCourses = courses.filter((c) => !c.is_published);

  // Prepare learner data for pie chart
  const learnersData: PieChartData[] = [
    { name: "Active Learners", value: activeLearners, color: CHART_COLORS.active },
    { name: "Inactive Learners", value: inactiveLearners, color: CHART_COLORS.inactive },
  ];

  // Prepare course data for pie chart
  const coursesData: PieChartData[] = [
    { name: "Published", value: publishedCourses.length, color: CHART_COLORS.published },
    { name: "Draft", value: draftCourses.length, color: CHART_COLORS.draft },
  ];

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading dashboard...</p>
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
          {/* Compact Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome, {user?.user_metadata?.full_name || "Manager"}!
                </h1>
                <p className="text-muted-foreground text-sm">Track learners and manage training courses</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/courses">
                <BookOpen className="mr-1.5 h-4 w-4" />
                Courses
              </Link>
            </Button>
          </div>

          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Learners</span>
              </div>
              <p className="text-2xl font-bold mt-1">{learners.length}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-secondary" />
                <span className="text-xs text-muted-foreground">Courses</span>
              </div>
              <p className="text-2xl font-bold mt-1">{courses.length}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-accent-foreground" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold mt-1">{pendingSubmissions.length}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold mt-1">{activeLearners}</p>
            </Card>
          </div>

          {/* Main Content - Side by Side Pie Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <PieChartCard
                  title="Learners Overview"
                  icon={Users}
                  data={learnersData}
                  centerLabel="Total"
                  centerValue={learners.length}
                  emptyMessage="No learners yet"
                />
                <PieChartCard
                  title="Courses Distribution"
                  icon={BookOpen}
                  data={coursesData}
                  centerLabel="Courses"
                  centerValue={courses.length}
                  emptyMessage="No courses created yet"
                />
              </div>
              
              {/* Pending Submissions Card */}
              <PendingSubmissionsCard />
            </div>

            {/* Quick Actions Sidebar */}
            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Quick Actions</h3>
                  </div>
                  <div className="space-y-2">
                    <Link
                      to="/manager/learners"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <UserPlus className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Manage Learners</p>
                        <p className="text-xs text-muted-foreground truncate">Add and assign levels</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <button
                      onClick={() => setAssignmentDialogOpen(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group text-left"
                    >
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <Send className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Assign Courses</p>
                        <p className="text-xs text-muted-foreground truncate">Assign to learners</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <Link
                      to="/courses"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-[hsl(var(--success))]/10 rounded-md">
                        <BookOpen className="h-4 w-4 text-[hsl(var(--success))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">View Courses</p>
                        <p className="text-xs text-muted-foreground truncate">Browse available courses</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/manager/assessments"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-accent/10 rounded-md">
                        <ClipboardList className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Assessments</p>
                        <p className="text-xs text-muted-foreground truncate">Create & manage</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/manager/progress"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <BarChart3 className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Learner Progress</p>
                        <p className="text-xs text-muted-foreground truncate">Track performance</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/manager/course-groups"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Course Groups</p>
                        <p className="text-xs text-muted-foreground truncate">Bundle & assign</p>
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

      <CourseAssignmentFlow
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
      />
    </AppSidebar>
  );
}
