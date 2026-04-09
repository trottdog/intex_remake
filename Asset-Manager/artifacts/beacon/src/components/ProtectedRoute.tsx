import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

type Role = "public" | "donor" | "staff" | "admin" | "super_admin";

function portalForRole(role: string): string {
  if (role === "donor") return "/donor";
  if (role === "admin" || role === "staff") return "/admin";
  if (role === "super_admin") return "/superadmin";
  return "/";
}

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (roles && user && !roles.includes(user.role as Role)) {
      setLocation(portalForRole(user.role));
    }
  }, [isLoading, isAuthenticated, user, roles, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f8]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (roles && user && !roles.includes(user.role as Role)) return null;

  return <>{children}</>;
}
