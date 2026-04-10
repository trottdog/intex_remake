import { useState } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { loginApi, verifyMfaApi } from "@/services/auth.service";
import { ApiError } from "@/services/api";
import lighthouseLogo from "@assets/Minimalist_lighthouse_logo_design_1775623783267.png";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingChallengeToken, setPendingChallengeToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeLogin = (token: string, role: string, user: Parameters<typeof login>[1]) => {
    flushSync(() => {
      login(token, user);
    });

    if (role === "super_admin") setLocation("/superadmin");
    else if (role === "admin" || role === "staff") setLocation("/admin");
    else if (role === "donor") setLocation("/donor");
    else setLocation("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const data = await loginApi(username, password);
      if (data.mfaRequired) {
        if (!data.challengeToken) {
          setError("MFA challenge was not created. Contact support.");
          return;
        }

        setPendingChallengeToken(data.challengeToken);
        setPassword("");
        setMfaCode("");
        return;
      }

      if (!data.token || !data.user) {
        setError("Login response was incomplete.");
        return;
      }

      completeLogin(data.token, data.user.role, data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to connect to server. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChallengeToken) {
      setError("MFA session expired. Please sign in again.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await verifyMfaApi(pendingChallengeToken, mfaCode);
      if (!data.token || !data.user) {
        setError("MFA verification response was incomplete.");
        return;
      }

      setPendingChallengeToken(null);
      setMfaCode("");
      completeLogin(data.token, data.user.role, data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to verify MFA code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#214636] flex">
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#214636] via-[#214636] to-[#3a6a54]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white bg-[#214636] ring-1 ring-white/30 shrink-0">
                <img src={lighthouseLogo} alt="Beacon" className="h-8 w-8 object-contain shrink-0" />
              </div>
              <span className="text-white text-2xl font-bold tracking-tight">Beacon</span>
            </div>
            <a
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to site
            </a>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Empowering those<br />who protect survivors.
          </h1>
          <p className="text-[#9fe3c0] text-lg leading-relaxed">
            A unified management platform for safehouse networks supporting survivors of abuse and trafficking.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: "Residents Served", value: "60+" },
            { label: "Safe Homes", value: "9" },
            { label: "Donations Raised", value: "₱30,000+" },
            { label: "Donations", value: "420+" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/55 bg-white/92 p-4 shadow-[0_18px_40px_rgba(8,20,15,0.22)] backdrop-blur-sm"
            >
              <div className="text-2xl font-bold text-[#1f5c45]">{stat.value}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#355848]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center bg-[#f9f9f8] p-8" aria-labelledby="login-heading">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white bg-[#214636] ring-1 ring-white/30 shrink-0">
                <img src={lighthouseLogo} alt="Beacon" className="h-8 w-8 object-contain shrink-0" />
              </div>
              <span className="text-[#214636] text-2xl font-bold">Beacon</span>
            </div>
            <a
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-gray-700 transition-colors hover:text-[#214636]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to site
            </a>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-8">
              <h2 id="login-heading" className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
              <p className="mt-2 text-sm text-gray-700">Authorized personnel only - all access is logged and audited.</p>
            </div>

            <form onSubmit={pendingChallengeToken ? handleVerifyMfa : handleSubmit} className="space-y-5">
              {!pendingChallengeToken ? (
                <>
                  <div>
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        title={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-gray-600 transition-colors hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214636] focus-visible:ring-offset-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600">
                    Password requirements: 12+ characters with uppercase, lowercase, digit, and special character.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    MFA is enabled on this account. Enter the 6-digit verification code to complete sign in.
                  </div>
                  <div>
                    <Label htmlFor="mfaCode" className="text-sm font-medium text-gray-700">Verification code</Label>
                    <Input
                      id="mfaCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                      required
                      className="mt-1.5"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#214636] hover:bg-[#2d5947] text-white h-11 font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {pendingChallengeToken ? "Verifying..." : "Signing in..."}
                  </>
                ) : pendingChallengeToken ? "Verify code" : "Sign in"}
              </Button>

              {pendingChallengeToken && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => {
                    setPendingChallengeToken(null);
                    setMfaCode("");
                    setError(null);
                  }}
                >
                  Back to password login
                </Button>
              )}
            </form>

            <div className="mt-5 rounded-lg border border-[#c8e6d4] bg-[#f0faf6] px-4 py-3 text-sm text-[#214636]">
              <span className="font-medium">Don't have an account?</span>{" "}
              <a href="/donate?createAccount=1" className="font-semibold text-[#2a9d72] hover:underline">
                Create an account
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-600">
                By signing in, you agree to Beacon's security and data handling policies.
              </p>
              <p className="mt-2 text-xs text-gray-600">
                <a href="/privacy" className="font-medium text-[#214636] underline-offset-2 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Demo environment.</span> Contact your administrator for access credentials.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
