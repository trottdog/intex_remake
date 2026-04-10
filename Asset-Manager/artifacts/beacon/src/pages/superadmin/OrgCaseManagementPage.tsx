import { useEffect, useState } from "react";
import { Users, ClipboardList, Home, FileText } from "lucide-react";
import CaseConferencesPage from "@/pages/admin/CaseConferencesPage";
import InterventionPlansPage from "@/pages/admin/InterventionPlansPage";
import HomeVisitationsPage from "@/pages/admin/HomeVisitationsPage";
import ProcessRecordingsPage from "@/pages/admin/ProcessRecordingsPage";

const TABS = [
  { id: "conferences",  label: "Case Conferences",    icon: Users },
  { id: "plans",        label: "Intervention Plans",  icon: ClipboardList },
  { id: "visits",       label: "Home Visitations",    icon: Home },
  { id: "recordings",   label: "Process Recordings",  icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function OrgCaseManagementPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const defaultTab = (params.get("tab") as TabId) || "conferences";
  const [tab, setTab] = useState<TabId>(["conferences", "plans", "visits", "recordings"].includes(defaultTab) ? defaultTab : "conferences");

  const handleTabChange = (nextTab: TabId) => {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [tab]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Case Management</h1>
        <p className="text-sm text-gray-500 mt-1">Organization-wide case conferences, intervention plans, home visits, and process recordings</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === id ? "bg-white text-[#0e2118] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "conferences"  && <CaseConferencesPage />}
        {tab === "plans"        && <InterventionPlansPage />}
        {tab === "visits"       && <HomeVisitationsPage />}
        {tab === "recordings"   && <ProcessRecordingsPage />}
      </div>
    </div>
  );
}
