import { useState } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { loginApi } from "@/services/auth.service";
import { ApiError } from "@/services/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const data = await loginApi(username, password);
      flushSync(() => {
        login(data.token, data.user);
      });
      const role = data.user.role;
      if (role === "super_admin") setLocation("/superadmin");
      else if (role === "admin" || role === "staff") setLocation("/admin");
      else if (role === "donor") setLocation("/donor");
      else setLocation("/");
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

  return (
    <div className="min-h-screen bg-[#214636] flex">
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#214636] via-[#214636] to-[#3a6a54]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2a9d72] rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-2xl font-bold tracking-tight">Beacon</span>
            </div>
            <a
              href="/"
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to site
            </a>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Empowering those<br />who protect survivors.
          </h1>
          <p className="text-[#2a9d72] text-lg leading-relaxed">
            A unified management platform for safehouse networks supporting survivors of abuse and trafficking.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: "Residents Served", value: "500+" },
            { label: "Active Safehouses", value: "3" },
            { label: "Reintegrations", value: "87" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-[#2a9d72]">{stat.value}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#f9f9f8]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#214636] rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#2a9d72]" />
              </div>
              <span className="text-[#214636] text-2xl font-bold">Beacon</span>
            </div>
            <a
              href="/"
              className="flex items-center gap-1.5 text-gray-500 hover:text-[#214636] text-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to site
            </a>
          </div>
          <a
            href="/"
            className="hidden lg:flex items-center gap-1.5 text-gray-400 hover:text-[#214636] text-sm transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </a>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
              <p className="text-gray-500 text-sm mt-2">Authorized personnel only — all access is logged and audited.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Password requirements: 12+ characters with uppercase, lowercase, digit, and special character.
              </p>

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
                    Signing in...
                  </>
                ) : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                By signing in, you agree to Beacon's security and data handling policies.
              </p>
              <p className="text-xs text-gray-300 mt-2">
                <a href="/privacy" className="hover:underline hover:text-gray-500">Privacy Policy</a>
              </p>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Demo environment.</span> Contact your administrator for access credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
