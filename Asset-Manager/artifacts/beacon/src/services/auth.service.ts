import { apiPost } from "./api";
import type { AuthUser } from "@/contexts/AuthContext";

export type { AuthUser };

export interface LoginResponse {
  token: string | null;
  user: AuthUser | null;
  mfaRequired: boolean;
  challengeToken: string | null;
}

export interface RegisterDonorResponse {
  id: number;
  username: string;
  email: string;
  supporterId: number | null;
}

export function loginApi(username: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { username, password });
}

export function verifyMfaApi(challengeToken: string, code: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/mfa/verify", { challengeToken, code });
}

export function registerDonorApi(payload: {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}): Promise<RegisterDonorResponse> {
  return apiPost<RegisterDonorResponse>("/api/auth/register-donor", payload);
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
