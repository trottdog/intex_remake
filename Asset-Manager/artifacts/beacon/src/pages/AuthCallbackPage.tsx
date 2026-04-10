import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services/api";
import { parseOAuthCallbackPayload, verifyMfaApi } from "@/services/auth.service";

function portalForRole(role: string): string {
  if (role === "super_admin") return "/superadmin";
  if (role === "admin" || role === "staff") return "/admin";
  if (role === "donor") return "/donor";
  return "/";
}

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  useEffect(() => {
    const payload = parseOAuthCallbackPayload(window.location.hash);
    window.history.replaceState({}, document.title, window.location.pathname);

    if (payload.error) {
      setError(payload.error);
      setIsLoading(false);
      return;
    }

    if (payload.mfaRequired) {
      if (!payload.challengeToken) {
        setError("The MFA challenge was not included in the Google sign-in response.");
      } else {
        setChallengeToken(payload.challengeToken);
      }
      setIsLoading(false);
      return;
    }

    if (!payload.token || !payload.user) {
      setError("The Google sign-in response was incomplete.");
      setIsLoading(false);
      return;
    }

    flushSync(() => {
      login(payload.token!, payload.user!);
    });
    setLocation(portalForRole(payload.user.role));
  }, [login, setLocation]);

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challengeToken) {
      setError("The MFA challenge has expired. Please start again.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await verifyMfaApi(challengeToken, mfaCode);
      if (!data.token || !data.user) {
        setError("The MFA verification response was incomplete.");
        return;
      }

      flushSync(() => {
        login(data.token!, data.user!);
      });
      setLocation(portalForRole(data.user.role));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to verify the MFA code.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f9f8] px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Completing sign-in</h1>
        <p className="mt-2 text-sm text-gray-700">
          Beacon is validating your Google sign-in and preparing your secure session.
        </p>

        {isLoading ? (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#c8e6d4] bg-[#f0faf6] px-4 py-3 text-sm text-[#214636]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finalizing your account access...
          </div>
        ) : challengeToken ? (
          <form onSubmit={handleVerifyMfa} className="mt-6 space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              MFA is enabled on this account. Enter the 6-digit verification code to continue.
            </div>
            <div>
              <Label htmlFor="oauth-mfa-code" className="text-sm font-medium text-gray-700">Verification code</Label>
              <Input
                id="oauth-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1.5"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                required
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#214636] text-white hover:bg-[#2d5947]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : "Verify code"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setLocation("/login")}>
              Back to sign in
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error ?? "Google sign-in could not be completed."}
            </div>
            <Button type="button" className="w-full bg-[#214636] text-white hover:bg-[#2d5947]" onClick={() => setLocation("/login")}>
              Return to login
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
