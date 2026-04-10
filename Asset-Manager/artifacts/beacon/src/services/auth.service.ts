import { ApiError, apiFetch, apiPost } from "./api";
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

export interface OAuthCallbackPayload {
  token: string | null;
  user: AuthUser | null;
  mfaRequired: boolean;
  challengeToken: string | null;
  error: string | null;
}

export interface MfaStatusResponse {
  enabled: boolean;
  enrollmentPending: boolean;
}

export interface MfaSetupResponse {
  manualEntryKey: string;
  otpAuthUri: string;
  qrCodeSvg: string;
  expiresInSeconds: number;
}

export function loginApi(username: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { username, password });
}

export function verifyMfaApi(challengeToken: string, code: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/mfa/verify", { challengeToken, code });
}

export function getMfaStatusApi(): Promise<MfaStatusResponse> {
  return apiFetch<MfaStatusResponse>("/api/auth/mfa");
}

export function setupMfaApi(): Promise<MfaSetupResponse> {
  return apiPost<MfaSetupResponse>("/api/auth/mfa/setup", {});
}

export function enableMfaApi(code: string): Promise<MfaStatusResponse> {
  return apiPost<MfaStatusResponse>("/api/auth/mfa/enable", { code });
}

export function disableMfaApi(code: string): Promise<MfaStatusResponse> {
  return apiPost<MfaStatusResponse>("/api/auth/mfa/disable", { code });
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

export async function startGoogleLogin(): Promise<void> {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  const loginUrl = new URL("/api/auth/oauth/google/start", window.location.origin);
  loginUrl.searchParams.set("returnUrl", callbackUrl.toString());

  const response = await fetch(loginUrl.toString(), {
    method: "GET",
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    const redirectLocation = response.headers.get("Location");
    if (redirectLocation) {
      window.location.assign(redirectLocation);
      return;
    }

    window.location.assign(loginUrl.toString());
    return;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    const message = body.error ?? "Request failed";
    if (message === "Google authentication is not configured") {
      return;
    }

    throw new ApiError(response.status, message);
  }

  window.location.assign(loginUrl.toString());
}

export function parseOAuthCallbackPayload(hash: string): OAuthCallbackPayload {
  const rawFragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(rawFragment);
  const encodedUser = params.get("user");

  let user: AuthUser | null = null;
  if (encodedUser) {
    try {
      const normalized = encodedUser.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      user = JSON.parse(new TextDecoder().decode(bytes)) as AuthUser;
    } catch {
      return {
        token: null,
        user: null,
        mfaRequired: false,
        challengeToken: null,
        error: "OAuth sign-in payload could not be read.",
      };
    }
  }

  return {
    token: params.get("token"),
    user,
    mfaRequired: params.get("mfaRequired") === "true",
    challengeToken: params.get("challengeToken"),
    error: params.get("error"),
  };
}
