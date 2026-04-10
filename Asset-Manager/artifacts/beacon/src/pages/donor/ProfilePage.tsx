import { useState, useEffect } from "react";
import { useGetMyDonorProfile, useListMyDonations, updateMyDonorProfile } from "@/services/donor.service";
import { useAuth } from "@/contexts/AuthContext";
import { applyConsent, getConsentLevel } from "@/lib/consent";
import { User, Mail, Phone, MapPin, Building, Shield, Bell, CreditCard, Edit3, Save, X, Lock, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type CommunicationPreferenceKey = "emailUpdates" | "impactReports" | "campaignAlerts" | "taxReceiptReminders";

const ACQUISITION_CHANNEL_OPTIONS = [
  "Social Media",
  "Friend or Family",
  "Search Engine",
  "Community Event",
  "Corporate Partner",
  "Email Newsletter",
  "Other",
] as const;

function parseDateLike(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetMyDonorProfile();
  const { data: donationHistory } = useListMyDonations({ page: 1, pageSize: 5000 });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [consentLevel, setConsentLevel] = useState<"all" | "essential">(() => {
    return getConsentLevel() === "all" ? "all" : "essential";
  });
  const [consentSaved, setConsentSaved] = useState(false);
  const [communicationPrefs, setCommunicationPrefs] = useState<Record<CommunicationPreferenceKey, boolean>>({
    emailUpdates: true,
    impactReports: true,
    campaignAlerts: false,
    taxReceiptReminders: true,
  });

  const communicationPrefItems: Array<{ key: CommunicationPreferenceKey; label: string }> = [
    { key: "emailUpdates", label: "Email Updates" },
    { key: "impactReports", label: "Impact Reports" },
    { key: "campaignAlerts", label: "Campaign Alerts" },
    { key: "taxReceiptReminders", label: "Tax Receipt Reminders" },
  ];

  const toggleCommunicationPref = (key: CommunicationPreferenceKey) => {
    setCommunicationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const donor = profile as Record<string, unknown> | undefined;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    communicationPreference: "",
    acquisitionChannel: "",
  });

  useEffect(() => {
    if (donor) {
      setForm({
        firstName: String(donor.firstName ?? user?.firstName ?? ""),
        lastName: String(donor.lastName ?? user?.lastName ?? ""),
        email: String(donor.email ?? user?.email ?? ""),
        phone: String(donor.phone ?? ""),
        organization: String(donor.organization ?? ""),
        communicationPreference: String(donor.communicationPreference ?? ""),
        acquisitionChannel: String(donor.acquisitionChannel ?? ""),
      });
    }
  }, [profile]);

  const firstDonationDate = (() => {
    const dates: Date[] = [];
    const fromProfile = parseDateLike(donor?.firstDonationDate);
    if (fromProfile) dates.push(fromProfile);
    for (const donation of donationHistory?.data ?? []) {
      const parsed = parseDateLike(donation.donationDate);
      if (parsed) dates.push(parsed);
    }
    if (dates.length === 0) return null;
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  })();

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        organizationName: form.organization,
        acquisitionChannel: form.acquisitionChannel,
      };
      const updatedProfile = await updateMyDonorProfile(payload) as Record<string, unknown>;
      updateUser({
        firstName: String(updatedProfile.firstName ?? form.firstName ?? user?.firstName ?? ""),
        lastName: String(updatedProfile.lastName ?? form.lastName ?? user?.lastName ?? ""),
        email: String(updatedProfile.email ?? user?.email ?? ""),
      });
      await queryClient.invalidateQueries({ queryKey: ["donor", "profile"] });
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (donor) {
      setForm({
        firstName: String(donor.firstName ?? user?.firstName ?? ""),
        lastName: String(donor.lastName ?? user?.lastName ?? ""),
        email: String(donor.email ?? user?.email ?? ""),
        phone: String(donor.phone ?? ""),
        organization: String(donor.organization ?? ""),
        communicationPreference: String(donor.communicationPreference ?? ""),
        acquisitionChannel: String(donor.acquisitionChannel ?? ""),
      });
    }
    setEditing(false);
    setSaveError(null);
  };

  const saveConsent = (level: "all" | "essential") => {
    applyConsent(level);
    setConsentLevel(level);
    setConsentSaved(true);
    setTimeout(() => setConsentSaved(false), 2000);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your donor information and communication preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0e2118] to-[#1a3a28] p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#2a9d72] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {form.firstName?.[0] ?? user?.firstName?.[0]}{form.lastName?.[0] ?? user?.lastName?.[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isLoading ? "Loading..." : `${form.firstName} ${form.lastName}`.trim() || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Donor"}
              </h2>
              <p className="text-white/60 text-sm">
                {isLoading ? "" : (donor?.supportType ? String(donor.supportType) : "Donor")} — Beacon Supporter
              </p>
            </div>
            <button
              onClick={() => editing ? handleCancel() : setEditing(true)}
              className="ml-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {editing ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Edit3 className="w-3.5 h-3.5" /> Edit</>}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 rounded-lg px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              Profile saved successfully.
            </div>
          )}
          {saveError && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-2 text-sm">{saveError}</div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> First Name</div>
                  {editing ? (
                    <input {...field("firstName")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30" />
                  ) : (
                    <div className="text-sm text-gray-800">{form.firstName || "—"}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Last Name</div>
                  {editing ? (
                    <input {...field("lastName")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30" />
                  ) : (
                    <div className="text-sm text-gray-800">{form.lastName || "—"}</div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</div>
                {editing ? (
                  <input {...field("email")} type="email" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30" />
                ) : (
                  <div className="text-sm text-gray-800">{form.email || "Not provided"}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</div>
                {editing ? (
                  <input {...field("phone")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30" />
                ) : (
                  <div className="text-sm text-gray-800">{form.phone || "Not provided"}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building className="w-3 h-3" /> Organization</div>
                {editing ? (
                  <input {...field("organization")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30" />
                ) : (
                  <div className="text-sm text-gray-800">{form.organization || "Not provided"}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Communication Preference</div>
                {editing ? (
                  <input {...field("communicationPreference")} placeholder="email, sms, post..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30" />
                ) : (
                  <div className="text-sm text-gray-800">{form.communicationPreference || "Not specified"}</div>
                )}
              </div>
            </div>
            {editing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 flex items-center gap-2 bg-[#0e2118] hover:bg-[#1a3a28] disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>

          <div className="border-t border-gray-50 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2a9d72]" />
              Giving Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Support Type</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{String(donor?.supportType ?? "individual")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Giving Frequency</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{donor?.isRecurring ? "Recurring" : "One-time"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Acquisition Channel</span>
                {editing ? (
                  <select
                    value={form.acquisitionChannel}
                    onChange={(e) => setForm((prev) => ({ ...prev, acquisitionChannel: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30"
                  >
                    <option value="">Select one</option>
                    {ACQUISITION_CHANNEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-medium text-gray-900 capitalize">{form.acquisitionChannel || "—"}</span>
                )}
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">Donor Since</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(firstDonationDate)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2a9d72]" />
              Communication Preferences
            </h3>
            <div className="space-y-3">
              {communicationPrefItems.map((pref) => {
                const enabled = communicationPrefs[pref.key];
                return (
                <div key={pref.key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{pref.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${pref.label}`}
                    onClick={() => toggleCommunicationPref(pref.key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-[#2a9d72]" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-4.5" : "translate-x-1"}`} />
                  </button>
                </div>
              )})}
            </div>
          </div>

          <div className="border-t border-gray-50 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2a9d72]" />
              Giving Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Lifetime Giving", value: `₱${Number(donor?.lifetimeGiving ?? 0).toLocaleString()}` },
                { label: "Last Gift", value: donor?.lastGiftAmount ? `₱${Number(donor.lastGiftAmount).toLocaleString()}` : "—" },
                { label: "Last Gift Date", value: String(donor?.lastGiftDate ?? "—") },
                { label: "Donor Tier", value: String(donor?.donorTier ?? "Supporter") },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#2a9d72]" />
          Privacy &amp; Consent Preferences
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Control how Beacon stores on-device preferences. Essential preferences keep your theme, sidebar, and consent choices consistent. Accept All also enables a non-essential <code>beacon_personalization</code> cookie.
        </p>
        <div className="space-y-3 mb-4">
          {([
            { id: "essential", label: "Essential Only", desc: "Stores only Beacon preference cookies such as theme, consent, and sidebar state. No analytics or cross-site tracking.", locked: true },
            { id: "all", label: "Accept All", desc: "Allows optional personalization and enables the non-essential beacon_personalization cookie." },
          ] as const).map((opt) => (
            <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${consentLevel === opt.id ? "border-[#2a9d72] bg-[#f0faf6]" : "border-gray-100 hover:border-gray-200"}`}>
              <input
                type="radio"
                name="consent"
                value={opt.id}
                checked={consentLevel === opt.id}
                onChange={() => saveConsent(opt.id)}
                className="mt-0.5 accent-[#2a9d72]"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        {consentSaved && (
          <p className="text-xs text-[#2a9d72] font-medium">Consent preferences saved.</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Beacon does not use cookies for authentication. See our <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a> for full details.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-xs text-amber-700">
          Profile edits are submitted for review. Contact our team at <strong>info@beaconngo.ph</strong> for urgent updates or tax receipt requests.
        </p>
      </div>
    </div>
  );
}
