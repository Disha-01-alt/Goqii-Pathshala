import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

const getRoleRedirectPath = (role: string | null): string | null => {
  switch (role) {
    case "admin": return "/admin";
    case "manager": return "/manager";
    case "sme": return "/sme";
    case "sme_expert": return "/sme-expert";
    case "learner": return "/learner";
    default: return null;
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    // Wait for both auth and role to finish loading
    if (authLoading || roleLoading) return;
    
    // Not logged in - redirect to auth
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    
    // Logged in with role - redirect to dashboard
    if (role) {
      const redirectPath = getRoleRedirectPath(role);
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, role, authLoading, roleLoading, navigate]);

  // Always show loader since we're redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
