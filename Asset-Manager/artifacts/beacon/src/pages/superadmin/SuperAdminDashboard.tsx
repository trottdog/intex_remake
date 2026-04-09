import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { MLOverviewSection } from "./MLOverviewWidgets";
import {
  useGetExecutiveDashboardSummary,
  useListSafehouses,
  type SafehouseBreakdownItem,
} from "@/services/superadmin.service";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Building2, Users, DollarSign, TrendingUp, AlertTriangle,
  ShieldAlert, Activity, Calendar, Brain, Settings2,
  ArrowRight, Loader2, ChevronDown, RefreshCw, Heart,
  BookOpen, FileText, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCENT = "#2a9d72";
const DARK = "#0e2118";
const MINT = "#7bc5a6";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
  unknown: "#94a3b8",
};

const CHANNEL_COLORS = ["#2a9d72", "#0e2118", "#7bc5a6", "#457b9d", "#e9c46a", "#f4a261"];

type Section =
  | "kpis"
  | "donationTrend"
  | "capacity"
  | "riskDistribution"
  | "reintegration"
  | "safehouseTable"
  | "incidentsFeed"
  | "mlAlerts"
  | "conferences"
  | "programAllocation"
  | "channelBreakdown";

const ALL_SECTIONS: { id: Section; label: string }[] = [
  { id: "kpis", label: "KPI Overview" },
  { id: "donationTrend", label: "Donation Trend" },
  { id: "capacity", label: "Safehouse Capacity" },
  { id: "riskDistribution", label: "Risk Distribution" },
  { id: "reintegration", label: "Reintegration Pipeline" },
  { id: "safehouseTable", label: "Safehouse Performance" },
  { id: "incidentsFeed", label: "Recent Incidents" },
  { id: "mlAlerts", label: "ML Risk Alerts" },
  { id: "conferences", label: "Upcoming Conferences" },
  { id: "programAllocation", label: "Program Allocation" },
  { id: "channelBreakdown", label: "Donor Channels" },
];

const STORAGE_KEY = "sa_dashboard_sections";
const MONTHS_KEY = "sa_dashboard_months";

function loadSections(): Record<Section, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return Object.fromEntries(ALL_SECTIONS.map(s => [s.id, true])) as Record<Section, boolean>;
}

function saveSections(v: Record<Section, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
}

function fmt(n: number | undefined | null, prefix = ""): string {
  if (n == null || isNaN(n)) return "—";
  return `${prefix}${n.toLocaleString()}`;
}

function fmtPeso(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

type Trend = "up" | "down" | "neutral";

function KpiCard({
  label, value, sub, icon: Icon, color = ACCENT, trend,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string; trend?: Trend;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      {sub && (
        <div className={`text-xs ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, to, count }: { title: string; to?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
        {title}
        {count != null && (
          <span className="ml-2 bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </h3>
      {to && (
        <Link href={to}>
          <button className="text-xs text-[#2a9d72] hover:text-[#0e2118] flex items-center gap-1 font-medium transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity?: string | null }) {
  const s = (severity ?? "").toLowerCase();
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${map[s] ?? "bg-gray-100 text-gray-500"}`}>
      {s || "unknown"}
    </span>
  );
}

function RiskBadge({ level }: { level?: string | null }) {
  const l = (level ?? "").toLowerCase();
  return (
    <span
      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${RISK_COLORS[l] ?? "#94a3b8"}22`, color: RISK_COLORS[l] ?? "#94a3b8" }}
    >
      {l || "—"}
    </span>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : ACCENT;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

const MONTHS_OPTIONS = [
  { label: "1M", value: 1 },
  { label: "3M", value: 3 },
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
  { label: "24M", value: 24 },
];

export default function SuperAdminDashboard() {
  const [safehouseId, setSafehouseId] = useState<number | null>(null);
  const [months, setMonths] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(MONTHS_KEY) ?? "12") || 12; } catch { return 12; }
  });
  const [sections, setSections] = useState<Record<Section, boolean>>(loadSections);
  const [showCustomize, setShowCustomize] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useGetExecutiveDashboardSummary(
    { safehouseId, months }
  );
  const { data: safehousesData } = useListSafehouses({ pageSize: 100 });
  const allSafehouses = safehousesData?.data ?? [];

  useEffect(() => {
    try { localStorage.setItem(MONTHS_KEY, String(months)); } catch {}
  }, [months]);

  function toggleSection(id: Section) {
    setSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveSections(next);
      return next;
    });
  }

  const riskPieData = useMemo(() => {
    const rd = data?.riskDistribution;
    if (!rd) return [];
    return [
      { name: "Low", value: rd.low, color: RISK_COLORS.low },
      { name: "Medium", value: rd.medium, color: RISK_COLORS.medium },
      { name: "High", value: rd.high, color: RISK_COLORS.high },
      { name: "Critical", value: rd.critical, color: RISK_COLORS.critical },
      { name: "Unknown", value: rd.unknown, color: RISK_COLORS.unknown },
    ].filter(d => d.value > 0);
  }, [data?.riskDistribution]);

  const reintegrationData = useMemo(() => {
    const rb = data?.reintegrationBreakdown;
    if (!rb) return [];
    return [
      { stage: "Not Started", count: rb.notStarted, color: "#94a3b8" },
      { stage: "In Progress", count: rb.inProgress, color: "#f59e0b" },
      { stage: "Ready", count: rb.ready, color: ACCENT },
      { stage: "Completed", count: rb.completed, color: DARK },
    ];
  }, [data?.reintegrationBreakdown]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#2a9d72]" />
        <span className="text-sm">Loading executive dashboard…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-medium text-gray-600">Dashboard data unavailable</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const recentIncidents = data.recentIncidents ?? [];
  const upcomingConfs = data.upcomingConferences ?? [];
  const mlAlerts = data.mlAlerts ?? [];
  const safehouseBreakdown: SafehouseBreakdownItem[] = data.safehouseBreakdown ?? [];
  const donationTrend = data.donationTrend ?? [];
  const allocationByProgram = data.allocationByProgram ?? [];
  const donationByChannel = data.donationByChannel ?? [];

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live organization-wide snapshot across all safehouses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Safehouse filter */}
          <div className="relative">
            <select
              value={safehouseId ?? ""}
              onChange={e => setSafehouseId(e.target.value ? parseInt(e.target.value) : null)}
              className="appearance-none text-sm border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2a9d72] cursor-pointer"
            >
              <option value="">All Safehouses</option>
              {allSafehouses.map(sh => (
                <option key={sh.safehouseId ?? sh.id} value={sh.safehouseId ?? sh.id ?? ""}>
                  {sh.name ?? sh.safehouseCode}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Month range */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            {MONTHS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMonths(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  months === opt.value
                    ? "bg-[#0e2118] text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          {/* Customize */}
          <button
            onClick={() => setShowCustomize(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              showCustomize
                ? "bg-[#0e2118] text-white border-[#0e2118]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" /> Customize
          </button>
        </div>
      </div>

      {/* ── Customize Panel ───────────────────────────────────────────────────── */}
      {showCustomize && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Toggle Panels</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSection(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  sections[s.id]
                    ? "bg-[#0e2118] text-white border-[#0e2118]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Row ───────────────────────────────────────────────────────────── */}
      {sections.kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="Active Residents"
            value={fmt(data.activeResidents)}
            sub={`${fmt(data.admissionsThisMonth)} new this month`}
            icon={Users}
            color={ACCENT}
            trend="neutral"
          />
          <KpiCard
            label="Safehouses"
            value={fmt(data.totalSafehouses)}
            sub={`${fmt(data.activeSafehouses)} active`}
            icon={Building2}
            color={DARK}
          />
          <KpiCard
            label="Total Funds Raised"
            value={fmtPeso(data.totalDonations)}
            sub={`${fmt(data.totalDonationCount)} donations`}
            icon={DollarSign}
            color={ACCENT}
            trend="up"
          />
          <KpiCard
            label="Donors / Supporters"
            value={fmt(data.totalSupporters)}
            sub="All channels"
            icon={TrendingUp}
            color="#457b9d"
          />
          <KpiCard
            label="Open Incidents"
            value={fmt(data.openIncidents)}
            sub={`${fmt(data.incidentsThisWeek)} this week`}
            icon={ShieldAlert}
            color={data.openIncidents && data.openIncidents > 0 ? "#ef4444" : ACCENT}
            trend={data.openIncidents && data.openIncidents > 0 ? "down" : "neutral"}
          />
          <KpiCard
            label="High Risk Residents"
            value={fmt(data.highRiskResidents)}
            sub="High + critical"
            icon={AlertTriangle}
            color={data.highRiskResidents && data.highRiskResidents > 0 ? "#f97316" : ACCENT}
            trend={data.highRiskResidents && data.highRiskResidents > 0 ? "down" : "neutral"}
          />
          <KpiCard
            label="Reintegration Rate"
            value={fmtPct(data.reintegrationRate)}
            sub={`${fmt(data.reintegrationCount)} completed`}
            icon={CheckCircle2}
            color={ACCENT}
            trend="up"
          />
          <KpiCard
            label="Upcoming Conferences"
            value={fmt(data.upcomingCaseConferences)}
            sub="Within 7 days"
            icon={Calendar}
            color="#7c3aed"
          />
        </div>
      )}

      {/* ── Secondary KPIs ───────────────────────────────────────────────────── */}
      {sections.kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Avg Health Score", value: data.avgHealthScore != null ? `${data.avgHealthScore}/10` : "—", icon: Heart, color: "#e11d48" },
            { label: "Avg Education Progress", value: data.avgEducationProgress != null ? `${data.avgEducationProgress}%` : "—", icon: BookOpen, color: "#7c3aed" },
            { label: "Active Intervention Plans", value: fmt(data.activeInterventionPlans), icon: Activity, color: ACCENT },
            { label: "Session Records (30d)", value: fmt(data.processRecordingsThisMonth), icon: FileText, color: "#0891b2" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${kpi.color}18` }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div>
                <div className="text-xs text-gray-400">{kpi.label}</div>
                <div className="font-bold text-gray-900">{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Donation Trend + Safehouse Capacity ──────────────────────────────── */}
      <div className={`grid ${sections.donationTrend && sections.capacity ? "lg:grid-cols-2" : ""} gap-6`}>
        {sections.donationTrend && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Donation Trend" to="/superadmin/donors" />
            {donationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={donationTrend} margin={{ left: -10, right: 8 }}>
                  <defs>
                    <linearGradient id="donGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [fmtPeso(v), "Amount"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="amount" stroke={ACCENT} strokeWidth={2} fill="url(#donGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No donation data</div>
            )}
            <div className="mt-3 flex gap-4 text-xs text-gray-400">
              <span>Total: <span className="font-semibold text-gray-700">{fmtPeso(data.totalDonations)}</span></span>
              <span>Transactions: <span className="font-semibold text-gray-700">{fmt(data.totalDonationCount)}</span></span>
            </div>
          </div>
        )}

        {sections.capacity && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Safehouse Capacity" to="/superadmin/safehouses" />
            {safehouseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={safehouseBreakdown} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="currentOccupancy" name="Occupied" fill={ACCENT} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="capacityGirls" name="Capacity" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No safehouse data</div>
            )}
          </div>
        )}
      </div>

      {/* ── Risk Distribution + Reintegration Pipeline ───────────────────────── */}
      <div className={`grid ${sections.riskDistribution && sections.reintegration ? "lg:grid-cols-2" : ""} gap-6`}>
        {sections.riskDistribution && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Risk Level Distribution" to="/superadmin/residents" />
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {riskPieData.length > 0 ? (
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {riskPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
              <div className="flex-1 space-y-2">
                {riskPieData.map(d => {
                  const total = riskPieData.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                      <span className="text-xs font-semibold text-gray-900">{d.value}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {sections.reintegration && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Reintegration Pipeline" to="/superadmin/residents" />
            {reintegrationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={reintegrationData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {reintegrationData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
            )}
            <div className="mt-3 flex justify-between text-xs text-gray-400">
              <span>Total tracked: <span className="font-semibold text-gray-700">{fmt((data.reintegrationBreakdown?.notStarted ?? 0) + (data.reintegrationBreakdown?.inProgress ?? 0) + (data.reintegrationBreakdown?.ready ?? 0) + (data.reintegrationBreakdown?.completed ?? 0))}</span></span>
              <span>Success rate: <span className="font-semibold text-[#2a9d72]">{fmtPct(data.reintegrationRate)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* ── Safehouse Performance Table ───────────────────────────────────────── */}
      {sections.safehouseTable && safehouseBreakdown.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <SectionHeader title="Safehouse Performance" to="/superadmin/safehouses" count={safehouseBreakdown.length} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Safehouse", "Status", "Occupancy", "Active", "High Risk", "Open Incidents", "Risk Breakdown"].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-3 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {safehouseBreakdown.map(sh => (
                  <tr key={sh.safehouseId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900 whitespace-nowrap">{sh.name ?? "—"}</div>
                      {sh.region && <div className="text-xs text-gray-400">{sh.region}</div>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sh.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {sh.status ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 min-w-[120px]">
                      <OccupancyBar pct={sh.occupancyPct ?? 0} />
                      <div className="text-xs text-gray-400 mt-0.5">{sh.currentOccupancy}/{sh.capacityGirls}</div>
                    </td>
                    <td className="py-3 pr-4 text-center font-semibold text-gray-900">{sh.activeResidents ?? 0}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`font-semibold ${(sh.highRiskCount ?? 0) > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {sh.highRiskCount ?? 0}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`font-semibold ${(sh.openIncidents ?? 0) > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {sh.openIncidents ?? 0}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {[
                          { color: RISK_COLORS.low, count: sh.riskLow ?? 0, title: "Low" },
                          { color: RISK_COLORS.medium, count: sh.riskMedium ?? 0, title: "Med" },
                          { color: RISK_COLORS.high, count: sh.riskHigh ?? 0, title: "High" },
                          { color: RISK_COLORS.critical, count: sh.riskCritical ?? 0, title: "Crit" },
                        ].map(r => (
                          <div key={r.title} className="flex flex-col items-center" title={r.title}>
                            <div className="w-1 rounded-full" style={{ height: Math.max(4, r.count * 4), backgroundColor: r.color }} />
                            <span className="text-[9px] text-gray-400 mt-0.5">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Incidents + ML Alerts + Conferences ──────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.incidentsFeed && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Recent Incidents" to="/superadmin/incidents" count={recentIncidents.length} />
            {recentIncidents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No incidents on record</p>
            ) : (
              <div className="space-y-2.5">
                {recentIncidents.slice(0, 7).map(inc => (
                  <div key={inc.incidentId} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <ShieldAlert className={`w-4 h-4 mt-0.5 flex-shrink-0 ${inc.severity === "critical" || inc.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <SeverityBadge severity={inc.severity} />
                        <span className="text-xs text-gray-500 capitalize">{(inc.incidentType ?? "").replace(/_/g, " ")}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {inc.safehouseName ?? "—"} · {inc.incidentDate ?? "—"}
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${inc.status === "open" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                      {inc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sections.mlAlerts && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="ML Risk Alerts" to="/superadmin/ml" count={mlAlerts.length} />
            {mlAlerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No ML predictions available</p>
            ) : (
              <div className="space-y-2.5">
                {mlAlerts.slice(0, 7).map(alert => {
                  const score = alert.predictionScore ?? 0;
                  const color = score >= 0.8 ? RISK_COLORS.critical : score >= 0.6 ? RISK_COLORS.high : score >= 0.4 ? RISK_COLORS.medium : RISK_COLORS.low;
                  return (
                    <div key={alert.predictionId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <Brain className="w-4 h-4 flex-shrink-0" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{alert.entityLabel ?? "—"}</div>
                        <div className="text-xs text-gray-400">{(alert.pipelineName ?? "").replace(/_/g, " ")}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold" style={{ color }}>{(score * 100).toFixed(0)}%</div>
                        <div className="w-12 h-1 bg-gray-100 rounded-full mt-1">
                          <div className="h-full rounded-full" style={{ width: `${score * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {sections.conferences && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Upcoming Conferences" to="/superadmin/case-management" count={upcomingConfs.length} />
            {upcomingConfs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No conferences in the next 7 days</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingConfs.map(conf => (
                  <div key={conf.conferenceId} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 capitalize">
                        {(conf.conferenceType ?? "Conference").replace(/_/g, " ")}
                      </div>
                      <div className="text-xs text-gray-400">{conf.conferenceDate ?? "—"}</div>
                    </div>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 flex-shrink-0">
                      {conf.status ?? "scheduled"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Program Allocation + Channel Breakdown ────────────────────────────── */}
      <div className={`grid ${sections.programAllocation && sections.channelBreakdown ? "lg:grid-cols-2" : ""} gap-6`}>
        {sections.programAllocation && allocationByProgram.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Donation Allocation by Program" to="/superadmin/donors" />
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={allocationByProgram.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="programArea"
                  >
                    {allocationByProgram.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmtPeso(v), "Allocated"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {allocationByProgram.slice(0, 6).map((a, i) => (
                  <div key={a.programArea} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{a.programArea}</span>
                    <span className="text-xs font-semibold text-gray-900">{a.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sections.channelBreakdown && donationByChannel.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <SectionHeader title="Donations by Channel" to="/superadmin/donors" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={donationByChannel} layout="vertical" margin={{ left: 8, right: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  formatter={(v: number) => [fmtPeso(v), "Amount"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {donationByChannel.map((_, i) => (
                    <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── AI Intelligence Section ──────────────────────────────────────────── */}
      <MLOverviewSection />

    </div>
  );
}
