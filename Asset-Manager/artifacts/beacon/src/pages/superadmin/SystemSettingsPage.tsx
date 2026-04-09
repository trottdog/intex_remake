import { useState } from "react";
import { Settings, Shield, Bell, Database, Lock, Globe, Save, CheckCircle } from "lucide-react";

interface SettingSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const sections: SettingSection[] = [
  { id: "security", icon: <Shield size={18} />, title: "Security", description: "Password policy, session timeouts, 2FA enforcement" },
  { id: "notifications", icon: <Bell size={18} />, title: "Notifications", description: "Email alerts, incident thresholds, report schedules" },
  { id: "data", icon: <Database size={18} />, title: "Data Retention", description: "Record archival rules and export settings" },
  { id: "access", icon: <Lock size={18} />, title: "Access Control", description: "Role permissions and safehouse assignment rules" },
  { id: "public", icon: <Globe size={18} />, title: "Public Portal", description: "Donor-facing content visibility and branding" },
];

export default function SystemSettingsPage() {
  const [activeSection, setActiveSection] = useState("security");
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    minPasswordLength: 12,
    sessionTimeoutMinutes: 60,
    require2fa: false,
    loginAttempts: 5,
    emailNotifications: true,
    incidentAlertThreshold: 3,
    dataRetentionYears: 7,
    exportEnabled: true,
    donorPortalEnabled: true,
    publicImpactEnabled: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "security":
        return (
          <div className="space-y-5">
            <h3 className="font-semibold text-gray-900">Security Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Minimum Password Length</label>
                <input type="number" min={8} max={32} value={settings.minPasswordLength}
                  onChange={e => setSettings(s => ({ ...s, minPasswordLength: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters required</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Session Timeout (minutes)</label>
                <input type="number" min={15} max={480} value={settings.sessionTimeoutMinutes}
                  onChange={e => setSettings(s => ({ ...s, sessionTimeoutMinutes: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Login Attempts</label>
                <input type="number" min={3} max={10} value={settings.loginAttempts}
                  onChange={e => setSettings(s => ({ ...s, loginAttempts: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <button
                  onClick={() => setSettings(s => ({ ...s, require2fa: !s.require2fa }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.require2fa ? "bg-[#2a9d72]" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.require2fa ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-gray-700">Require 2FA for admin roles</span>
              </div>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-5">
            <h3 className="font-semibold text-gray-900">Notification Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.emailNotifications ? "bg-[#2a9d72]" : "bg-gray-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailNotifications ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-gray-700">Email notifications enabled</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Incident Alert Threshold</label>
                <input type="number" min={1} max={10} value={settings.incidentAlertThreshold}
                  onChange={e => setSettings(s => ({ ...s, incidentAlertThreshold: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
                <p className="text-xs text-gray-400 mt-1">Incidents per week before escalation alert</p>
              </div>
            </div>
          </div>
        );
      case "data":
        return (
          <div className="space-y-5">
            <h3 className="font-semibold text-gray-900">Data Retention Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Retention Period (years)</label>
                <input type="number" min={1} max={20} value={settings.dataRetentionYears}
                  onChange={e => setSettings(s => ({ ...s, dataRetentionYears: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
                <p className="text-xs text-gray-400 mt-1">Minimum 7 years per data protection regulations</p>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <button onClick={() => setSettings(s => ({ ...s, exportEnabled: !s.exportEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.exportEnabled ? "bg-[#2a9d72]" : "bg-gray-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.exportEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-gray-700">Allow data export for admins</span>
              </div>
            </div>
          </div>
        );
      case "public":
        return (
          <div className="space-y-5">
            <h3 className="font-semibold text-gray-900">Public Portal Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Donor Portal</p>
                  <p className="text-xs text-gray-400">Allow donor accounts to log in and view their giving history</p>
                </div>
                <button onClick={() => setSettings(s => ({ ...s, donorPortalEnabled: !s.donorPortalEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.donorPortalEnabled ? "bg-[#2a9d72]" : "bg-gray-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.donorPortalEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Public Impact Snapshots</p>
                  <p className="text-xs text-gray-400">Show published impact reports on the public-facing site</p>
                </div>
                <button onClick={() => setSettings(s => ({ ...s, publicImpactEnabled: !s.publicImpactEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.publicImpactEnabled ? "bg-[#2a9d72]" : "bg-gray-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.publicImpactEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center py-12 text-gray-400">
            <Settings size={36} className="mx-auto mb-3 opacity-40" />
            <p>Select a category to configure settings</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Platform configuration and operational parameters</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? "bg-green-500 text-white" : "bg-[#2a9d72] text-white hover:bg-[#238c63]"}`}>
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-56 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-colors ${activeSection === s.id ? "bg-[#0e2118] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              <span className={activeSection === s.id ? "text-[#2a9d72]" : "text-gray-400"}>{s.icon}</span>
              <span className="font-medium">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
