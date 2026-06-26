import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { useLevels } from "@/hooks/useLevels";
import { useCourseLibrary } from "@/hooks/useCourseLibrary";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChartCard, PieChartData } from "@/components/PieChartCard";
import { 
  Users, 
  BookOpen, 
  Layers, 
  Settings, 
  UserPlus, 
  Shield, 
  Loader2, 
  ChevronRight,
  Crown,
  Briefcase,
  GraduationCap,
  Sparkles,
  Building2
} from "lucide-react";

interface RoleCount {
  role: string;
  count: number;
}

// Chart colors using semantic theme colors
const CHART_COLORS = {
  admin: "hsl(142, 70%, 35%)",      // Primary green
  manager: "hsl(38, 92%, 50%)",     // Amber
  sme: "hsl(262, 83%, 58%)",        // Purple
  sme_expert: "hsl(199, 89%, 48%)", // Blue
  learner: "hsl(142, 60%, 50%)",    // Light green
  // For levels/courses
  level1: "hsl(142, 70%, 35%)",
  level2: "hsl(142, 60%, 45%)",
  level3: "hsl(38, 92%, 50%)",
  level4: "hsl(262, 83%, 58%)",
  level5: "hsl(199, 89%, 48%)",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { levels, isLoading: levelsLoading } = useLevels();
  const { courses, isLoading: coursesLoading } = useCourseLibrary();
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const [roleCounts, setRoleCounts] = useState<RoleCount[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const { data: roles } = await supabase.from("user_roles").select("role");

        if (roles) {
          const counts: Record<string, number> = {};
          roles.forEach((r) => {
            counts[r.role] = (counts[r.role] || 0) + 1;
          });

          setRoleCounts(Object.entries(counts).map(([role, count]) => ({ role, count })));
          setTotalUsers(roles.length);
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const isLoading = loading || levelsLoading || coursesLoading || orgsLoading;

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

  const getRoleCount = (role: string) => roleCounts.find((r) => r.role === role)?.count || 0;

  // Prepare users by role data for pie chart
  const usersData: PieChartData[] = [
    { name: "Admins", value: getRoleCount("admin"), color: CHART_COLORS.admin },
    { name: "Managers", value: getRoleCount("manager"), color: CHART_COLORS.manager },
    { name: "SMEs", value: getRoleCount("sme"), color: CHART_COLORS.sme },
    { name: "SME Experts", value: getRoleCount("sme_expert"), color: CHART_COLORS.sme_expert },
    { name: "Learners", value: getRoleCount("learner"), color: CHART_COLORS.learner },
  ];

  // Prepare courses by level data for pie chart
  const levelColors = [CHART_COLORS.level1, CHART_COLORS.level2, CHART_COLORS.level3, CHART_COLORS.level4, CHART_COLORS.level5];
  const coursesData: PieChartData[] = levels.map((level, index) => ({
    name: level.display_name,
    value: courses.filter((c) => c.level_id === level.id).length,
    color: levelColors[index % levelColors.length],
  }));

  // Add unassigned courses if any
  const unassignedCourses = courses.filter((c) => !c.level_id).length;
  if (unassignedCourses > 0) {
    coursesData.push({
      name: "Unassigned",
      value: unassignedCourses,
      color: "hsl(220, 9%, 46%)",
    });
  }

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Compact Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome, {user?.user_metadata?.full_name || "Admin"}!
                </h1>
                <p className="text-muted-foreground text-sm">Manage users, levels, and system configuration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/users">
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Users
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/settings">
                  <Settings className="mr-1.5 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Users</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalUsers}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Admins</span>
              </div>
              <p className="text-2xl font-bold mt-1">{getRoleCount("admin")}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-secondary" />
                <span className="text-xs text-muted-foreground">Managers</span>
              </div>
              <p className="text-2xl font-bold mt-1">{getRoleCount("manager")}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">SMEs</span>
              </div>
              <p className="text-2xl font-bold mt-1">{getRoleCount("sme") + getRoleCount("sme_expert")}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-xs text-muted-foreground">Learners</span>
              </div>
              <p className="text-2xl font-bold mt-1">{getRoleCount("learner")}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Orgs</span>
              </div>
              <p className="text-2xl font-bold mt-1">{organizations.length}</p>
            </Card>
          </div>

          {/* Main Content - Side by Side Pie Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-4">
                <PieChartCard
                  title="Users by Role"
                  icon={Users}
                  data={usersData}
                  centerLabel="Total"
                  centerValue={totalUsers}
                  emptyMessage="No users found"
                />
                <PieChartCard
                  title="Courses by Level"
                  icon={BookOpen}
                  data={coursesData}
                  centerLabel="Courses"
                  centerValue={courses.length}
                  emptyMessage="No courses created yet"
                />
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Quick Actions</h3>
                  </div>
                  <div className="space-y-2">
                    <Link
                      to="/admin/users"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <UserPlus className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">User Management</p>
                        <p className="text-xs text-muted-foreground truncate">Create & manage users</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/admin/levels"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-[hsl(var(--success))]/10 rounded-md">
                        <Layers className="h-4 w-4 text-[hsl(var(--success))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Level Management</p>
                        <p className="text-xs text-muted-foreground truncate">Define learner levels</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    <Link
                      to="/courses"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-1.5 bg-secondary/10 rounded-md">
                        <BookOpen className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">All Courses</p>
                        <p className="text-xs text-muted-foreground truncate">View & manage courses</p>
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
                        <p className="font-medium text-sm">System Settings</p>
                        <p className="text-xs text-muted-foreground truncate">AI & configuration</p>
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
