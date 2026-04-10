import { useGetAdminDashboardSummary } from "@/services/admin.service";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import {
  Users, ShieldAlert, Calendar, AlertTriangle, Activity, Loader2,
  TrendingUp, ClipboardList, ArrowRight, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const RISK_COLORS = { low: "#2a9d72", medium: "#f4a261", high: "#e76f51", critical: "#e63946" };
const RISK_LABELS = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

const REIN_STAGES = [
  { key: "notStarted",  label: "Not Started",  color: "#e2e8f0" },
  { key: "onHold",      label: "On Hold",      color: "#f4a261" },
  { key: "inProgress",  label: "In Progress",  color: "#93c5fd" },
  { key: "completed",   label: "Completed",    color: "#2a9d72" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmt(n: number) {
  return n.toLocaleString("en-PH");
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useGetAdminDashboardSummary();
  const { user } = useAuth();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-[#2a9d72]" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
        <p className="font-medium">Failed to load dashboard data</p>
        <p className="text-xs mt-1 text-gray-400">Ensure the API server is running</p>
      </div>
    </div>
  );

  const riskPieData = Object.entries(RISK_COLORS).map(([key, fill]) => {
    const total = (data.residentsByRisk ?? []).reduce((s, sh) => s + ((sh as Record<string, number>)[key] ?? 0), 0);
    return { name: RISK_LABELS[key as keyof typeof RISK_LABELS], value: total, fill };
  }).filter(d => d.value > 0);

  const reintegrationBreakdown = (data as { reintegrationBreakdown?: Record<string, number> }).reintegrationBreakdown ?? {};
  const reintegrationDisplayBreakdown = {
    notStarted: reintegrationBreakdown.notStarted ?? 0,
    onHold: reintegrationBreakdown.ready ?? 0,
    inProgress: reintegrationBreakdown.inProgress ?? 0,
    completed: reintegrationBreakdown.completed ?? 0,
  };
  const totalInPipeline = REIN_STAGES.reduce((s, st) => s + (reintegrationDisplayBreakdown[st.key as keyof typeof reintegrationDisplayBreakdown] ?? 0), 0) || 1;

  const openIncidents = (data as { openIncidents?: number }).openIncidents ?? data.incidentsThisWeek ?? 0;
  const activeInterventionPlans = (data as { activeInterventionPlans?: number }).activeInterventionPlans ?? 0;
  const processRecordingsThisWeek = (data as { processRecordingsThisWeek?: number }).processRecordingsThisWeek ?? 0;

  const hasAlerts = (data.highRiskResidents ?? 0) > 0 || openIncidents > 0 || (data.overdueFollowUps ?? 0) > 0;

  const todayStr = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#2a9d72] mb-0.5">{getGreeting()}, {user?.firstName || user?.username}</p>
          <h1 className="text-2xl font-bold text-gray-900">Safehouse Operations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayStr}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Active Residents</p>
          <p className="text-4xl font-black text-[#0e2118]">{fmt(data.activeResidents ?? 0)}</p>
          <p className="text-xs text-gray-400">currently in care</p>
        </div>
      </div>

      {/* Alert Banner */}
      {hasAlerts && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 mb-1">Items requiring your attention today</p>
            <div className="flex flex-wrap gap-3">
              {(data.highRiskResidents ?? 0) > 0 && (
                <Link href="/admin/residents" className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full hover:bg-red-200 transition-colors">
                  <AlertTriangle className="w-3 h-3" />
                  {data.highRiskResidents} high-risk residents
                </Link>
              )}
              {openIncidents > 0 && (
                <Link href="/admin/incidents" className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full hover:bg-orange-200 transition-colors">
                  <ShieldAlert className="w-3 h-3" />
                  {openIncidents} open incidents
                </Link>
              )}
              {(data.overdueFollowUps ?? 0) > 0 && (
                <Link href="/admin/case-conferences" className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full hover:bg-amber-200 transition-colors">
                  <Clock className="w-3 h-3" />
                  {data.overdueFollowUps} overdue conferences
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "High-Risk Cases",
            value: data.highRiskResidents ?? 0,
            sub: "require immediate attention",
            icon: AlertTriangle,
            href: "/admin/residents",
            urgent: (data.highRiskResidents ?? 0) > 0,
            urgentColor: "text-red-600",
            iconColor: "#e63946",
          },
          {
            label: "Open Incidents",
            value: openIncidents,
            sub: "unresolved reports",
            icon: ShieldAlert,
            href: "/admin/incidents",
            urgent: openIncidents > 0,
            urgentColor: "text-orange-600",
            iconColor: "#e76f51",
          },
          {
            label: "Upcoming Conferences",
            value: data.upcomingCaseConferences ?? 0,
            sub: "within the next 7 days",
            icon: Calendar,
            href: "/admin/case-conferences",
            urgent: false,
            urgentColor: "text-blue-600",
            iconColor: "#457b9d",
          },
          {
            label: "Overdue Follow-ups",
            value: data.overdueFollowUps ?? 0,
            sub: "past scheduled date",
            icon: Clock,
            href: "/admin/case-conferences",
            urgent: (data.overdueFollowUps ?? 0) > 0,
            urgentColor: "text-amber-600",
            iconColor: "#f4a261",
          },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <div className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md hover:border-[#2a9d72]/30 ${kpi.urgent ? "border-red-100" : "border-gray-100"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
                <kpi.icon className="w-4 h-4 shrink-0" style={{ color: kpi.iconColor }} />
              </div>
              <p className={`text-3xl font-black ${kpi.urgent ? kpi.urgentColor : "text-gray-900"}`}>{fmt(kpi.value)}</p>
              <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: Charts */}
        <div className="lg:col-span-2 space-y-5">

          {/* Risk Distribution */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Resident Risk Distribution</h3>
                <p className="text-xs text-gray-400 mt-0.5">Current risk profile across all active residents</p>
              </div>
              <Link href="/admin/residents" className="flex items-center gap-1 text-xs text-[#2a9d72] font-semibold hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {riskPieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-44 h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {riskPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number, name: string) => [val, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {riskPieData.map(d => (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                          <span className="text-gray-700 font-medium">{d.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{d.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${((d.value / (data.activeResidents || 1)) * 100).toFixed(0)}%`, backgroundColor: d.fill }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No active residents on record</p>
                </div>
              </div>
            )}
          </div>

          {/* Reintegration Pipeline */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Reintegration Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">Progress of active residents toward community reintegration</p>
              </div>
              <Link href="/admin/residents" className="flex items-center gap-1 text-xs text-[#2a9d72] font-semibold hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Horizontal pipeline bar */}
            <div className="flex h-6 rounded-full overflow-hidden mb-4 gap-0.5">
              {REIN_STAGES.map(stage => {
                const count = reintegrationDisplayBreakdown[stage.key as keyof typeof reintegrationDisplayBreakdown] ?? 0;
                const pct = (count / totalInPipeline) * 100;
                if (count === 0) return null;
                return (
                  <div
                    key={stage.key}
                    style={{ width: `${pct}%`, backgroundColor: stage.color }}
                    className="relative group cursor-default"
                    title={`${stage.label}: ${count} resident${count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>

            {/* Stage legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {REIN_STAGES.map(stage => {
                const count = reintegrationDisplayBreakdown[stage.key as keyof typeof reintegrationDisplayBreakdown] ?? 0;
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: stage.color === "#e2e8f0" ? "#cbd5e1" : stage.color }} />
                    <div>
                      <p className="text-xs text-gray-500 leading-tight">{stage.label}</p>
                      <p className="text-sm font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "New This Month",      value: data.admissionsThisMonth ?? 0,  icon: TrendingUp,    color: "#2a9d72", href: "/admin/residents" },
              { label: "Active Plans",         value: activeInterventionPlans,         icon: ClipboardList, color: "#457b9d", href: "/admin/intervention-plans" },
              { label: "Sessions This Week",   value: processRecordingsThisWeek,       icon: Activity,      color: "#9b59b6", href: "/admin/process-recordings" },
            ].map(stat => (
              <Link key={stat.label} href={stat.href} className="group">
                <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm hover:border-[#2a9d72]/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}18` }}>
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{fmt(stat.value)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Priority Action Queue */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Priority Actions</h3>
              <span className="text-xs bg-[#0e2118] text-white px-2 py-0.5 rounded-full font-bold">
                {(data.priorityAlerts ?? []).length}
              </span>
            </div>

            <div className="space-y-3">
              {(data.priorityAlerts ?? []).length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#2a9d72] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">All clear</p>
                  <p className="text-xs text-gray-400 mt-1">No urgent items at this time</p>
                </div>
              ) : (
                (data.priorityAlerts ?? []).map((alert, i) => {
                  const isHigh = alert.severity === "high";
                  const href = alert.type === "risk" ? "/admin/residents" : alert.type === "incident" ? "/admin/incidents" : "/admin/case-conferences";
                  return (
                    <Link key={i} href={href}>
                      <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${isHigh ? "bg-red-50 border-red-100 hover:border-red-200" : "bg-amber-50 border-amber-100 hover:border-amber-200"}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isHigh ? "bg-red-100" : "bg-amber-100"}`}>
                          {alert.type === "risk" ? <AlertTriangle className={`w-4 h-4 ${isHigh ? "text-red-600" : "text-amber-600"}`} /> :
                           alert.type === "incident" ? <ShieldAlert className={`w-4 h-4 ${isHigh ? "text-red-600" : "text-amber-600"}`} /> :
                           <Clock className={`w-4 h-4 ${isHigh ? "text-red-600" : "text-amber-600"}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-snug ${isHigh ? "text-red-900" : "text-amber-900"}`}>{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isHigh ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {isHigh ? "High" : "Medium"} priority
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Quick navigation links */}
            <div className="mt-6 pt-4 border-t border-gray-50 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-2">Quick Links</p>
              {[
                { label: "View All Residents",   href: "/admin/residents" },
                { label: "Open Incidents",        href: "/admin/incidents" },
                { label: "Upcoming Conferences",  href: "/admin/case-conferences" },
                { label: "Intervention Plans",    href: "/admin/intervention-plans" },
              ].map(link => (
                <Link key={link.href} href={link.href} className="flex items-center justify-between group py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-600 group-hover:text-[#0e2118] font-medium">{link.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#2a9d72] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
