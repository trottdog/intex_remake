import { useState } from "react";
import { useListIncidents, useListInterventionPlans, useListCaseConferences } from "@/services";
import { Bell, AlertTriangle, Clock, CheckCircle2, ClipboardList, Calendar, ShieldAlert } from "lucide-react";

type AlertItem = {
  id: string;
  type: "incident" | "intervention" | "conference";
  title: string;
  subtitle: string;
  severity: "high" | "medium" | "low";
  date: string;
};

export default function TasksAlertsPage() {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const { data: incidentsData } = useListIncidents({ status: "open" });
  const { data: plansData } = useListInterventionPlans({ status: "active" });
  const { data: confsData } = useListCaseConferences({ upcoming: true });

  const incidents = incidentsData?.data ?? [];
  const plans = plansData?.data ?? [];
  const conferences = confsData?.data ?? [];

  const alerts: AlertItem[] = [
    ...incidents.map(i => ({
      id: `inc-${i.id}`,
      type: "incident" as const,
      title: `Incident: ${i.incidentType}`,
      subtitle: i.description ?? "No description",
      severity: (i.severity === "critical" || i.severity === "high" ? "high" : i.severity === "medium" ? "medium" : "low") as "high" | "medium" | "low",
      date: i.incidentDate ?? "",
    })),
    ...plans
      .filter(p => p.targetDate && new Date(p.targetDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      .map(p => ({
        id: `plan-${p.id}`,
        type: "intervention" as const,
        title: `Intervention Plan: ${p.title}`,
        subtitle: `Due: ${p.targetDate} — ${p.residentCode}`,
        severity: "medium" as const,
        date: p.targetDate ?? "",
      })),
    ...conferences.map(c => ({
      id: `conf-${c.id}`,
      type: "conference" as const,
      title: `Case Conference Scheduled`,
      subtitle: `${c.scheduledDate} — ${c.residentCode}`,
      severity: "low" as const,
      date: c.scheduledDate ?? "",
    })),
  ].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);

  const typeIcon: Record<string, React.ElementType> = {
    incident: ShieldAlert,
    intervention: ClipboardList,
    conference: Calendar,
  };

  const severityColor: Record<string, string> = {
    high: "border-l-red-500 bg-red-50",
    medium: "border-l-amber-400 bg-amber-50",
    low: "border-l-blue-400 bg-blue-50",
  };

  const severityBadge: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-blue-100 text-blue-700",
  };

  const counts = {
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
    low: alerts.filter(a => a.severity === "low").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks &amp; Alerts</h1>
        <p className="text-gray-500 mt-1">Action items, open incidents, and upcoming deadlines</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 mb-2" />
          <p className="text-2xl font-bold text-red-700">{counts.high}</p>
          <p className="text-sm text-red-600">High Priority</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <Clock className="h-5 w-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-700">{counts.medium}</p>
          <p className="text-sm text-amber-600">Medium Priority</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <CheckCircle2 className="h-5 w-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-blue-700">{counts.low}</p>
          <p className="text-sm text-blue-600">Low Priority</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "high", "medium", "low"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-[#2a9d72] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${counts[f]})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
            <p>No alerts at this priority level.</p>
          </div>
        ) : (
          filtered.map(alert => {
            const Icon = typeIcon[alert.type] ?? Bell;
            return (
              <div key={alert.id} className={`bg-white border-l-4 rounded-r-xl shadow-sm p-4 flex items-start gap-4 ${severityColor[alert.severity]}`}>
                <div className={`p-2 rounded-lg ${alert.severity === "high" ? "bg-red-100" : alert.severity === "medium" ? "bg-amber-100" : "bg-blue-100"}`}>
                  <Icon className={`h-4 w-4 ${alert.severity === "high" ? "text-red-600" : alert.severity === "medium" ? "text-amber-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{alert.subtitle}</p>
                  {alert.date && <p className="text-xs text-gray-400 mt-1">{alert.date}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
