import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";
import {
  disableMfaApi,
  enableMfaApi,
  getMfaStatusApi,
  setupMfaApi,
  type MfaSetupResponse,
  type MfaStatusResponse,
} from "@/services/auth.service";
import { AlertCircle, CheckCircle2, Loader2, QrCode, Shield, Smartphone } from "lucide-react";

function toFriendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function MfaSettingsCard() {
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState<MfaStatusResponse>({
    enabled: user?.mfaEnabled ?? false,
    enrollmentPending: false,
  });
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"idle" | "status" | "setup" | "enable" | "disable">("idle");

  useEffect(() => {
    setStatus((current) => ({ ...current, enabled: user?.mfaEnabled ?? false }));
  }, [user?.mfaEnabled]);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      setLoading("status");
      try {
        const next = await getMfaStatusApi();
        if (!active) return;
        setStatus(next);
        updateUser({ mfaEnabled: next.enabled });
      } catch {
        if (!active) return;
      } finally {
        if (active) {
          setLoading("idle");
        }
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const isBusy = loading !== "idle";
  const qrCodeDataUri = setup
    ? `data:image/svg+xml;utf8,${encodeURIComponent(setup.qrCodeSvg)}`
    : null;

  async function handleStartSetup() {
    setError(null);
    setMessage(null);
    setLoading("setup");

    try {
      const response = await setupMfaApi();
      setSetup(response);
      setSetupCode("");
      setDisableCode("");
      setStatus((current) => ({ ...current, enrollmentPending: true }));
      setMessage("Scan the QR code with Google Authenticator, 1Password, Authy, or another TOTP app.");
    } catch (err) {
      setError(toFriendlyMessage(err, "Unable to start MFA setup."));
    } finally {
      setLoading("idle");
    }
  }

  async function handleEnableMfa(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading("enable");

    try {
      const response = await enableMfaApi(setupCode);
      setStatus(response);
      setSetup(null);
      setSetupCode("");
      updateUser({ mfaEnabled: response.enabled });
      setMessage("Multi-factor authentication is now enabled for this account.");
    } catch (err) {
      setError(toFriendlyMessage(err, "Unable to enable MFA."));
    } finally {
      setLoading("idle");
    }
  }

  async function handleDisableMfa(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading("disable");

    try {
      const response = await disableMfaApi(disableCode);
      setStatus(response);
      setDisableCode("");
      setSetup(null);
      updateUser({ mfaEnabled: response.enabled });
      setMessage("Multi-factor authentication has been disabled for this account.");
    } catch (err) {
      setError(toFriendlyMessage(err, "Unable to disable MFA."));
    } finally {
      setLoading("idle");
    }
  }

  const setupMinutes = setup ? Math.max(1, Math.ceil(setup.expiresInSeconds / 60)) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#2a9d72]" />
            Multi-Factor Authentication
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Protect this account with time-based one-time passwords from an authenticator app.
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {status.enabled ? "Enabled" : "Not enabled"}
        </span>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!status.enabled && !setup && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#d6ebe0] bg-[#f4fbf7] p-4 text-sm text-[#214636]">
            {status.enrollmentPending
              ? "A setup attempt is already pending for this account. Start setup again to generate a fresh QR code."
              : "Setup creates a QR code and a manual key for your authenticator app. You will verify one current code before MFA is turned on."}
          </div>
          <button
            type="button"
            onClick={handleStartSetup}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0e2118] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3a28] disabled:opacity-60"
          >
            {loading === "setup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            {status.enrollmentPending ? "Restart setup" : "Set up authenticator app"}
          </button>
        </div>
      )}

      {!status.enabled && setup && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mx-auto aspect-square w-full max-w-[188px] overflow-hidden rounded-lg bg-white">
                {qrCodeDataUri ? (
                  <img
                    src={qrCodeDataUri}
                    alt="MFA setup QR code"
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This setup expires in about {setupMinutes} minute{setupMinutes === 1 ? "" : "s"}.
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Manual entry key</p>
                <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">
                  {setup.manualEntryKey}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                If scanning is unavailable, enter the manual key in your authenticator app and create a standard 6-digit TOTP entry.
              </div>
            </div>
          </div>

          <form onSubmit={handleEnableMfa} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Current authenticator code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]"
                required
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isBusy || setupCode.length !== 6}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0e2118] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3a28] disabled:opacity-60"
              >
                {loading === "enable" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                Enable MFA
              </button>
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={isBusy}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Generate new code
              </button>
            </div>
          </form>
        </div>
      )}

      {status.enabled && (
        <form onSubmit={handleDisableMfa} className="space-y-3">
          <div className="rounded-lg border border-[#d6ebe0] bg-[#f4fbf7] p-4 text-sm text-[#214636]">
            MFA is active for this account. Enter a current authenticator code to disable it.
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Authenticator code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={disableCode}
              onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isBusy || disableCode.length !== 6}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            {loading === "disable" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Disable MFA
          </button>
        </form>
      )}
    </div>
  );
}
