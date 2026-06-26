import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath = "/" }: RoleGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  // Show loader while either auth or role is loading
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated but doesn't have the required role
  // Only redirect if they have a different role (not if role is null)
  if (role && !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // If role is null (no role assigned), still allow access to prevent loop
  // The component will handle showing appropriate content
  if (!role) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
