import { apiPost } from "./api";
import type { AuthUser } from "@/contexts/AuthContext";

export type { AuthUser };

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function loginApi(username: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { username, password });
}

export function changePasswordApi(
  currentPassword: string,
  newPassword: string,
  token: string,
): Promise<{ message: string }> {
  return apiPost<{ message: string }>(
    "/api/auth/change-password",
    { currentPassword, newPassword },
    token,
  );
}
