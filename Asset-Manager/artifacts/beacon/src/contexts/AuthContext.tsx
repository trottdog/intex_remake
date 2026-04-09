import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { setApiTokenGetter } from "../services/api";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "public" | "donor" | "staff" | "admin" | "super_admin";
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin?: string | null;
  supporterId?: number | null;
  safehouses?: number[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthTokenGetter(null);
    setApiTokenGetter(null);
  };

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(() => newToken);
    setApiTokenGetter(() => newToken);
  };

  // Listen for global 401 events dispatched by the API client
  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("beacon:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("beacon:unauthorized", handleUnauthorized);
  }, []);

  // Listen for global 403 events dispatched by the API client
  useEffect(() => {
    const handleForbidden = () => {
      window.location.href = "/forbidden";
    };
    window.addEventListener("beacon:forbidden", handleForbidden);
    return () => window.removeEventListener("beacon:forbidden", handleForbidden);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!user, user, token, login, logout, isLoading: false }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
