import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  updateUser: (updates: Partial<AuthUser>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_STORAGE_KEY = "beacon.auth.v1";
const LEGACY_AUTH_STORAGE_KEY = AUTH_STORAGE_KEY;

function persistAuth(token: string, user: AuthUser) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearPersistedAuth() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

function restorePersistedAuth(): { token: string; user: AuthUser } | null {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) ?? localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { token?: unknown; user?: unknown };
    if (typeof parsed.token !== "string" || !parsed.user || typeof parsed.user !== "object") {
      clearPersistedAuth();
      return null;
    }

    const restored = {
      token: parsed.token,
      user: parsed.user as AuthUser,
    };

    // Migrate any older persistent auth entry into tab-scoped storage.
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(restored));
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);

    return restored;
  } catch {
    clearPersistedAuth();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restored = restorePersistedAuth();
    if (restored) {
      setToken(restored.token);
      setUser(restored.user);
      setAuthTokenGetter(() => restored.token);
      setApiTokenGetter(() => restored.token);
    }

    setIsLoading(false);
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    clearPersistedAuth();
    setAuthTokenGetter(null);
    setApiTokenGetter(null);
  };

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    persistAuth(newToken, newUser);
    setAuthTokenGetter(() => newToken);
    setApiTokenGetter(() => newToken);
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...updates };
      if (token) {
        persistAuth(token, nextUser);
      }
      return nextUser;
    });
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
      value={{ isAuthenticated: !!user, user, token, login, updateUser, logout, isLoading }}
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
