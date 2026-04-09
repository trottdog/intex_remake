import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { changePasswordApi } from "@/services/auth.service";
import { Settings, Lock, User, Bell, Shield, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<"profile" | "password" | "notifications">("profile");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwMessage, setPwMessage] = useState("");

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwStatus("error");
      setPwMessage("New passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwStatus("error");
      setPwMessage("Password must be at least 8 characters.");
      return;
    }
    if (!token) {
      setPwStatus("error");
      setPwMessage("You must be logged in.");
      return;
    }
    setPwStatus("loading");
    try {
      await changePasswordApi(pwForm.currentPassword, pwForm.newPassword, token);
      setPwStatus("success");
      setPwMessage("Password changed successfully.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      setPwStatus("error");
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      setPwMessage(msg);
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#2a9d72]" />
          Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage your account and portal preferences</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${tab === t.id ? "border-l-[#2a9d72] bg-[#f0faf5] text-[#0e2118]" : "border-l-transparent text-gray-600 hover:bg-gray-50"}`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-9">
          {tab === "profile" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#2a9d72]" />
                Profile Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "First Name", value: user?.firstName },
                  { label: "Last Name", value: user?.lastName },
                  { label: "Username", value: user?.username },
                  { label: "Email", value: user?.email },
                  { label: "Role", value: user?.role?.replace("_", " ").toUpperCase() },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800">
                      {f.value ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                To update your profile information, please contact your system administrator.
              </div>
            </div>
          )}

          {tab === "password" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#2a9d72]" />
                Change Password
              </h2>

              {pwStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {pwMessage}
                </div>
              )}
              {pwStatus === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {pwMessage}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pwStatus === "loading"}
                  className="w-full bg-[#0e2118] text-white py-2 rounded-lg font-medium hover:bg-[#1a3a28] disabled:opacity-50 transition-colors"
                >
                  {pwStatus === "loading" ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
          )}

          {tab === "notifications" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#2a9d72]" />
                Notification Preferences
              </h2>
              <p className="text-sm text-gray-500">
                Notification delivery is managed at the system level. Contact your administrator to configure alert channels and escalation rules.
              </p>
              <div className="space-y-4">
                {[
                  { label: "New incident reports", description: "Get notified when a new incident is filed at your safehouse" },
                  { label: "Upcoming case conferences", description: "Reminders for scheduled case conferences 24h in advance" },
                  { label: "Intervention plan deadlines", description: "Alerts when intervention plan target dates are approaching" },
                  { label: "Resident status changes", description: "Updates when a resident's status changes" },
                  { label: "New resident admissions", description: "Notifications when new residents are admitted" },
                ].map((pref, i) => (
                  <label key={i} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="checkbox" defaultChecked={i < 3} className="mt-0.5 h-4 w-4 accent-[#2a9d72] rounded" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pref.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
