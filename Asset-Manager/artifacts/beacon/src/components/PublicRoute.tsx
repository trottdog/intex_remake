import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'donor') setLocation("/donor");
      else if (user.role === 'admin' || user.role === 'staff') setLocation("/admin");
      else if (user.role === 'super_admin') setLocation("/superadmin");
      else setLocation("/");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
