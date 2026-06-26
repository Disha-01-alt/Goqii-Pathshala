import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  Sparkles, 
  Library, 
  BookOpen, 
  Users, 
  LayoutDashboard,
  GraduationCap,
  Settings,
  Layers,
  FolderOpen,
  FileCheck
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export function RoleBasedNav() {
  const location = useLocation();
  const { role, isAdmin, isManager, isSME, isLearner, isSMEExpert } = useUserRole();

  const isActive = (path: string) => location.pathname === path;

  // Define nav items based on role
  const getNavItems = (): NavItem[] => {
    if (isAdmin) {
      return [
        { path: "/admin", label: "Dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
        { path: "/admin/users", label: "Users", icon: <Users className="mr-2 h-4 w-4" /> },
        { path: "/admin/levels", label: "Levels", icon: <Layers className="mr-2 h-4 w-4" /> },
        { path: "/library", label: "Modules", icon: <Library className="mr-2 h-4 w-4" /> },
        { path: "/courses", label: "Courses", icon: <BookOpen className="mr-2 h-4 w-4" /> },
      ];
    }

    if (isManager) {
      return [
        { path: "/manager", label: "Dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
        { path: "/manager/learners", label: "Learners", icon: <Users className="mr-2 h-4 w-4" /> },
        { path: "/courses", label: "Courses", icon: <BookOpen className="mr-2 h-4 w-4" /> },
      ];
    }

    if (isSMEExpert) {
      return [
        { path: "/sme-expert", label: "Dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
        { path: "/library", label: "Browse Modules", icon: <Library className="mr-2 h-4 w-4" /> },
        { path: "/courses", label: "Courses", icon: <BookOpen className="mr-2 h-4 w-4" /> },
      ];
    }

    if (isSME) {
      return [
        { path: "/sme", label: "Dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
        { path: "/library", label: "All Modules", icon: <Library className="mr-2 h-4 w-4" /> },
        { path: "/sme/my-modules", label: "My Modules", icon: <FolderOpen className="mr-2 h-4 w-4" /> },
      ];
    }

    if (isLearner) {
      return [
        { path: "/learner", label: "Dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
        { path: "/learner/courses", label: "My Courses", icon: <GraduationCap className="mr-2 h-4 w-4" /> },
      ];
    }

    // Default for users without role (shouldn't happen normally)
    return [
      { path: "/", label: "Create Module", icon: <Sparkles className="mr-2 h-4 w-4" /> },
      { path: "/library", label: "Modules", icon: <Library className="mr-2 h-4 w-4" /> },
      { path: "/courses", label: "Courses", icon: <BookOpen className="mr-2 h-4 w-4" /> },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="flex items-center gap-2">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant={isActive(item.path) ? "default" : "ghost"}
          asChild
          size="sm"
        >
          <Link to={item.path}>
            {item.icon}
            {item.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
