import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useGetExecutiveDashboardSummary,
  useListSafehouses,
} from "@/services/superadmin.service";
import { useListSocialMediaPosts, useListSupporters } from "@/services";
import { type Resident, useListResidents } from "@/services/residents.service";
import { apiFetch } from "@/services/api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  Clock3,
  DollarSign,
  Loader2,
  RefreshCw,
  Repeat2,
  Settings2,
  Share2,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCENT = "#2a9d72";
const DARK = "#0e2118";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
  unknown: "#94a3b8",
};

const PLATFORM_COLORS = ["#2a9d72", "#0e2118", "#7bc5a6", "#457b9d", "#e9c46a"];

type Section = "kpis" | "careGaps" | "donorHealth";

const ALL_SECTIONS: { id: Section; label: string }[] = [
  { id: "kpis", label: "Top KPIs" },
  { id: "careGaps", label: "Care Gaps" },
  { id: "donorHealth", label: "Donor Health" },
];

const STORAGE_KEY = "sa_dashboard_sections";
const MONTHS_KEY = "sa_dashboard_months";

const MONTHS_OPTIONS = [
  { label: "1M", value: 1 },
  { label: "3M", value: 3 },
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
  { label: "24M", value: 24 },
];

type ProcessRecordingItem = {
  recordingId?: number | null;
  residentId?: number | null;
  residentCode?: string | null;
  sessionDate?: string | null;
  socialWorker?: string | null;
  progressNoted?: boolean | null;
  concernsFlagged?: boolean | null;
};

type AttentionResident = {
  residentId?: number | null;
  label: string;
  safehouseName: string;
  riskLevel?: string | null;
  signals: string[];
  score: number;
  daysSinceUpdate: number | null;
};

function defaultSections(): Record<Section, boolean> {
  return Object.fromEntries(ALL_SECTIONS.map((section) => [section.id, true])) as Record<Section, boolean>;
}

function loadSections(): Record<Section, boolean> {
  const defaults = defaultSections();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) } as Record<Section, boolean>;
  } catch {
    return defaults;
  }
}

function saveSections(value: Record<Section, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

function fmt(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

function fmtPeso(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const value = n <= 1 ? n * 100 : n;
  return `${value.toFixed(1)}%`;
}

function periodLabel(months: number): string {
  if (months <= 1) return "This month";
  return `Last ${months} months`;
}

function toDateValue(dateString?: string | null): number | null {
  if (!dateString) return null;
  const value = new Date(dateString).getTime();
  return Number.isNaN(value) ? null : value;
}

function daysSince(dateString?: string | null): number | null {
  const value = toDateValue(dateString);
  if (value == null) return null;
  return Math.max(0, Math.floor((Date.now() - value) / (1000 * 60 * 60 * 24)));
}

function safeResidentLabel(resident: Resident): string {
  return resident.internalCode ?? resident.residentCode ?? resident.caseControlNo ?? "Resident";
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = ACCENT,
  emphasis = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        emphasis
          ? "border-red-100 bg-white hover:border-red-200 hover:shadow-md"
          : "border-gray-100 bg-white hover:border-[#2a9d72]/30 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</div>
          <div className={`mt-3 text-3xl font-black leading-none ${emphasis ? "text-red-600" : "text-gray-900"}`}>
            {value}
          </div>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      {sub ? <div className={`mt-3 text-xs ${emphasis ? "text-red-600" : "text-gray-400"}`}>{sub}</div> : null}
    </div>
  );
}

function SectionHeader({
  title,
  description,
  to,
  cta = "View all",
}: {
  title: string;
  description?: string;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {to ? (
        <Link href={to}>
          <button className="inline-flex items-center gap-1 text-sm font-semibold text-[#2a9d72] transition-colors hover:underline">
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      ) : null}
    </div>
  );
}

function RiskBadge({ level }: { level?: string | null }) {
  const value = (level ?? "unknown").toLowerCase();
  const color = RISK_COLORS[value] ?? RISK_COLORS.unknown;
  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {value}
    </span>
  );
}

export default function SuperAdminDashboard() {
  const [safehouseId, setSafehouseId] = useState<number | null>(null);
  const [months, setMonths] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(MONTHS_KEY) ?? "12", 10) || 12;
    } catch {
      return 12;
    }
  });
  const [sections, setSections] = useState<Record<Section, boolean>>(loadSections);
  const [showCustomize, setShowCustomize] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useGetExecutiveDashboardSummary({ safehouseId, months });
  const { data: safehousesData } = useListSafehouses({ pageSize: 100 });
  const { data: residentsData } = useListResidents({ pageSize: 200, safehouseId: safehouseId ?? undefined, caseStatus: "active" });
  const { data: supportersData } = useListSupporters({ pageSize: 1000 });
  const { data: socialPostsData } = useListSocialMediaPosts({ pageSize: 200 });
  const { data: recordingsData } = useQuery<{ data: ProcessRecordingItem[]; total: number }>({
    queryKey: ["process-recordings", "dashboard", safehouseId ?? "all"],
    queryFn: () => apiFetch(`/api/process-recordings?pageSize=500${safehouseId ? `&safehouseId=${safehouseId}` : ""}`),
  });

  const allSafehouses = safehousesData?.data ?? [];
  const activeResidents = residentsData?.data ?? [];
  const supporters = supportersData?.data ?? [];
  const socialPosts = socialPostsData?.data ?? [];
  const processRecordings = recordingsData?.data ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(MONTHS_KEY, String(months));
    } catch {}
  }, [months]);

  function toggleSection(id: Section) {
    setSections((previous) => {
      const next = { ...previous, [id]: !previous[id] };
      saveSections(next);
      return next;
    });
  }

  const safehouseMap = useMemo(() => {
    return new Map((data?.safehouseBreakdown ?? []).map((safehouse) => [safehouse.safehouseId, safehouse]));
  }, [data?.safehouseBreakdown]);

  const latestRecordingByResident = useMemo(() => {
    const map = new Map<number, ProcessRecordingItem>();
    for (const recording of processRecordings) {
      if (!recording.residentId) continue;
      const current = map.get(recording.residentId);
      if (!current || (toDateValue(recording.sessionDate) ?? -1) > (toDateValue(current.sessionDate) ?? -1)) {
        map.set(recording.residentId, recording);
      }
    }
    return map;
  }, [processRecordings]);

  const careGapSignals = useMemo(() => {
    const noRecentUpdateCount = activeResidents.filter((resident) => {
      const lastRecording = resident.residentId ? latestRecordingByResident.get(resident.residentId) : undefined;
      const elapsed = daysSince(lastRecording?.sessionDate);
      return elapsed == null || elapsed > 30;
    }).length;

    const missingAssignedSupportCount = activeResidents.filter(
      (resident) => !resident.assignedSocialWorker && !resident.assignedWorkerName,
    ).length;

    const stalledProgressCount = activeResidents.filter((resident) => {
      const lastRecording = resident.residentId ? latestRecordingByResident.get(resident.residentId) : undefined;
      return lastRecording?.progressNoted === false;
    }).length;

    const overCapacitySafehouseCount = (data?.safehouseBreakdown ?? []).filter(
      (safehouse) => (safehouse.occupancyPct ?? 0) >= 90,
    ).length;

    return {
      noRecentUpdateCount,
      missingAssignedSupportCount,
      stalledProgressCount,
      overCapacitySafehouseCount,
    };
  }, [activeResidents, data?.safehouseBreakdown, latestRecordingByResident]);

  const attentionResidents = useMemo<AttentionResident[]>(() => {
    return activeResidents
      .map((resident) => {
        const lastRecording = resident.residentId ? latestRecordingByResident.get(resident.residentId) : undefined;
        const elapsed = daysSince(lastRecording?.sessionDate);
        const occupancy = resident.safehouseId ? safehouseMap.get(resident.safehouseId)?.occupancyPct ?? 0 : 0;
        const riskLevel = resident.currentRiskLevel ?? resident.riskLevel ?? "unknown";
        const signals: string[] = [];

        if (elapsed == null || elapsed > 30) signals.push("No recent update");
        if (!resident.assignedSocialWorker && !resident.assignedWorkerName) signals.push("Missing assigned support");
        if (lastRecording?.progressNoted === false) signals.push("Stalled progress");
        if (occupancy >= 90) signals.push("Capacity pressure");

        const riskScore =
          riskLevel === "critical" ? 4 :
          riskLevel === "high" ? 3 :
          riskLevel === "medium" ? 2 :
          riskLevel === "low" ? 1 :
          0;

        return {
          residentId: resident.residentId,
          label: safeResidentLabel(resident),
          safehouseName: resident.safehouseName ?? "Unassigned safehouse",
          riskLevel,
          signals,
          daysSinceUpdate: elapsed,
          score:
            riskScore +
            (signals.includes("No recent update") ? 3 : 0) +
            (signals.includes("Missing assigned support") ? 2 : 0) +
            (signals.includes("Stalled progress") ? 2 : 0) +
            (signals.includes("Capacity pressure") ? 1 : 0),
        };
      })
      .filter((resident) => resident.signals.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [activeResidents, latestRecordingByResident, safehouseMap]);

  const reintegrationData = useMemo(() => {
    const breakdown = data?.reintegrationBreakdown;
    if (!breakdown) return [];
    return [
      { stage: "Not Started", count: breakdown.notStarted, color: "#94a3b8" },
      { stage: "In Progress", count: breakdown.inProgress, color: "#f59e0b" },
      { stage: "Ready", count: breakdown.ready, color: ACCENT },
      { stage: "Completed", count: breakdown.completed, color: DARK },
    ];
  }, [data?.reintegrationBreakdown]);

  const donorSummary = useMemo(() => {
    const donorRecords = supporters.filter(
      (supporter) => (supporter.donationCount ?? 0) > 0 || !!supporter.firstDonationDate || !!supporter.lastGiftDate,
    );
    const returning = donorRecords.filter((supporter) => (supporter.donationCount ?? 0) > 1).length;
    const newer = donorRecords.filter((supporter) => (supporter.donationCount ?? 0) <= 1).length;
    return {
      totalDonors: donorRecords.length,
      returning,
      newer,
      returningPct: donorRecords.length > 0 ? (returning / donorRecords.length) * 100 : null,
    };
  }, [supporters]);

  const donationMomentum = useMemo(() => {
    const trend = data?.donationTrend ?? [];
    if (trend.length < 2) return null;
    const recent = trend.slice(-Math.min(3, trend.length));
    const prior = trend.slice(Math.max(0, trend.length - 6), Math.max(0, trend.length - 3));
    const recentTotal = recent.reduce((sum, point) => sum + point.amount, 0);
    const priorTotal = prior.reduce((sum, point) => sum + point.amount, 0);
    if (prior.length === 0 || priorTotal === 0) return null;
    return ((recentTotal - priorTotal) / priorTotal) * 100;
  }, [data?.donationTrend]);

  const socialSummary = useMemo(() => {
    const totalReferrals = socialPosts.reduce((sum, post) => sum + (post.donationReferrals ?? 0), 0);
    const byPlatform = new Map<string, { platform: string; referrals: number }>();

    for (const post of socialPosts) {
      const platform = post.platform ?? "other";
      const current = byPlatform.get(platform) ?? { platform, referrals: 0 };
      current.referrals += post.donationReferrals ?? 0;
      byPlatform.set(platform, current);
    }

    const platformBreakdown = [...byPlatform.values()].sort((a, b) => b.referrals - a.referrals).slice(0, 4);
    const topPost = [...socialPosts].sort((a, b) => {
      const referralDiff = (b.donationReferrals ?? 0) - (a.donationReferrals ?? 0);
      if (referralDiff !== 0) return referralDiff;
      return (b.estimatedDonationValuePhp ?? 0) - (a.estimatedDonationValuePhp ?? 0);
    })[0];

    return { totalReferrals, platformBreakdown, topPost };
  }, [socialPosts]);

  if (isLoading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#2a9d72]" />
        <span className="text-sm">Loading executive dashboard…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-gray-400">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm font-medium text-gray-600">Dashboard data unavailable</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const selectedPeriod = periodLabel(months);
  const returningDonorDisplay = donorSummary.returningPct != null ? `${donorSummary.returningPct.toFixed(1)}%` : "—";
  const hasPriorityCases = attentionResidents.length > 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Focused on care risk, donor retention, and what is driving donor action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={safehouseId ?? ""}
              onChange={(event) => setSafehouseId(event.target.value ? parseInt(event.target.value, 10) : null)}
              className="cursor-pointer appearance-none rounded-xl border border-gray-100 bg-white py-1.5 pl-3 pr-7 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2a9d72]"
            >
              <option value="">All Safehouses</option>
              {allSafehouses.map((safehouse) => (
                <option key={safehouse.safehouseId ?? safehouse.id} value={safehouse.safehouseId ?? safehouse.id ?? ""}>
                  {safehouse.name ?? safehouse.safehouseCode}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="flex items-center overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {MONTHS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMonths(option.value)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  months === option.value ? "bg-[#2a9d72] text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="rounded-xl border border-gray-100 bg-white p-1.5 text-gray-500 shadow-sm transition-colors hover:text-gray-800"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowCustomize((value) => !value)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              showCustomize
                ? "border-[#2a9d72] bg-[#2a9d72] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" /> Customize
          </button>
        </div>
      </div>

      {showCustomize ? (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Show Sections</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  sections[section.id]
                    ? "border-[#2a9d72] bg-[#2a9d72] text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sections.kpis ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Survivors in Care"
            value={fmt(data.activeResidents)}
            sub={`${fmt(data.activeSafehouses)} active safehouses`}
            icon={Users}
          />
          <KpiCard
            label="Cases at Risk"
            value={fmt(data.highRiskResidents)}
            sub="High and critical cases needing close attention"
            icon={AlertTriangle}
            color="#dc2626"
            emphasis
          />
          <KpiCard
            label="Total Donations"
            value={fmtPeso(data.totalDonations)}
            sub={`${selectedPeriod} · ${fmt(data.totalDonationCount)} gifts tracked`}
            icon={DollarSign}
          />
          <KpiCard
            label="Returning Donors %"
            value={returningDonorDisplay}
            sub={`${fmt(donorSummary.returning)} returning donors out of ${fmt(donorSummary.totalDonors)}`}
            icon={Repeat2}
            color="#457b9d"
          />
        </div>
      ) : null}

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {sections.careGaps ? (
          <div className="h-full">
            <section className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Preventing Girls From Falling Through the Cracks"
                description="A compact executive view of cases needing intervention, safehouse pressure, and reintegration flow."
                to="/superadmin/residents"
                cta="View residents"
              />

              <div
                className={`mt-6 rounded-xl border p-5 ${
                  hasPriorityCases ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-[#f8fbf9]"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cases Needing Attention</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Priority signals pulled from case coverage, assignment gaps, recent progress, and capacity pressure.
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      hasPriorityCases ? "bg-red-100 text-red-700" : "bg-emerald-50 text-[#2a9d72]"
                    }`}
                  >
                    {hasPriorityCases ? <AlertTriangle className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    {fmt(attentionResidents.length)} priority cases surfaced
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "No recent update",
                      value: careGapSignals.noRecentUpdateCount,
                      note: "30+ days since last case recording",
                      icon: Clock3,
                      toneAlert: "border-amber-200 bg-amber-50 text-amber-800",
                      toneCalm: "border-gray-200 bg-white text-gray-500",
                    },
                    {
                      label: "Missing assigned support",
                      value: careGapSignals.missingAssignedSupportCount,
                      note: "Active cases without a named worker",
                      icon: UserX,
                      toneAlert: "border-red-200 bg-red-50 text-red-800",
                      toneCalm: "border-gray-200 bg-white text-gray-500",
                    },
                    {
                      label: "Stalled progress",
                      value: careGapSignals.stalledProgressCount,
                      note: "Latest session recorded no progress",
                      icon: TrendingUp,
                      toneAlert: "border-orange-200 bg-orange-50 text-orange-800",
                      toneCalm: "border-gray-200 bg-white text-gray-500",
                    },
                    {
                      label: "Capacity pressure",
                      value: careGapSignals.overCapacitySafehouseCount,
                      note: "Safehouses above 90% occupancy",
                      icon: Building2,
                      toneAlert: "border-[#bfe2cc] bg-[#eef8f3] text-[#2a9d72]",
                      toneCalm: "border-gray-200 bg-white text-gray-500",
                    },
                  ].map((item) => {
                    const active = item.value > 0;
                    return (
                      <div
                        key={item.label}
                        className={`rounded-xl border p-4 transition-colors ${
                          active ? `${item.toneAlert} border-[1.5px]` : item.toneCalm
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "" : "text-gray-400"}`}>
                            {item.label}
                          </span>
                          <item.icon className={`h-4 w-4 ${active ? "" : "text-gray-300"}`} />
                        </div>
                        <div className={`mt-3 font-bold ${active ? "text-4xl" : "text-3xl text-gray-500"}`}>{fmt(item.value)}</div>
                        <div className={`mt-2 text-xs ${active ? "opacity-90" : "text-gray-400"}`}>{item.note}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-3 border-t border-black/5 pt-5">
                  {attentionResidents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#cfe7d8] bg-white px-4 py-6 text-sm text-[#2a9d72]">
                      No urgent care gaps surfaced from the current resident and case-recording data.
                    </div>
                  ) : (
                    attentionResidents.map((resident) => (
                      <div
                        key={`${resident.residentId ?? resident.label}`}
                        className="rounded-xl border border-red-100 bg-white px-4 py-3"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">{resident.label}</span>
                              <RiskBadge level={resident.riskLevel} />
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              {resident.safehouseName}
                              {resident.daysSinceUpdate != null ? ` · ${resident.daysSinceUpdate} days since last update` : " · No case update on file"}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {resident.signals.map((signal) => (
                              <span
                                key={`${resident.label}-${signal}`}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                              >
                                {signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-8 border-t border-black/5 pt-6">
                <div className="min-h-[320px] rounded-xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Reintegration Progress</h3>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#2a9d72]">
                      {fmtPct(data.reintegrationRate)} success
                    </div>
                  </div>
                  {reintegrationData.length > 0 ? (
                    <>
                      <div className="mt-5">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={reintegrationData} layout="vertical" margin={{ left: 0, right: 18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={82} />
                            <Tooltip cursor={{ fill: "#f8fafc" }} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                              {reintegrationData.map((entry) => (
                                <Cell key={entry.stage} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-500">Completed reintegrations</span>
                        <span className="font-semibold text-gray-900">{fmt(data.reintegrationCount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-gray-400">No reintegration data</div>
                  )}
                </div>
              </div>

            </section>
          </div>
        ) : null}

        {sections.donorHealth ? (
          <div className="h-full">
            <section className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Donor Health & Retention"
                description="A clearer executive read on giving momentum, retention, and the channels that are creating donor action."
                to="/superadmin/donors"
                cta="View donors"
              />

              <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Donation Trend</h3>
                    <p className="mt-1 text-sm text-gray-500">{selectedPeriod} of donation movement across the organization.</p>
                  </div>
                  <div className="rounded-full border border-[#bfe2cc] bg-[#eef8f3] px-3 py-1.5 text-xs font-semibold text-[#2a9d72]">
                    {donationMomentum == null ? "Trend stabilizing" : `${donationMomentum >= 0 ? "+" : ""}${donationMomentum.toFixed(1)}% vs prior period`}
                  </div>
                </div>
                {(data.donationTrend ?? []).length > 0 ? (
                  <>
                    <div className="mt-3">
                      <ResponsiveContainer width="100%" height={310}>
                        <AreaChart data={data.donationTrend} margin={{ left: -14, right: 4, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="executive-donation-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.22} />
                              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="#edf2f7" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => [fmtPeso(value), "Amount"]}
                            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke={ACCENT}
                            strokeWidth={3}
                            fill="url(#executive-donation-gradient)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {[
                        { label: "Donations tracked", value: fmt(data.totalDonationCount) },
                        { label: "Total donations", value: fmtPeso(data.totalDonations) },
                        { label: "Returning donors", value: returningDonorDisplay },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-gray-100 bg-[#f8fbf9] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{item.label}</div>
                          <div className="mt-2 text-xl font-semibold text-gray-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-400">No donation trend data</div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Retention Summary</h3>
                    <p className="mt-1 text-sm text-gray-500">A concise snapshot of how many donors are coming back and how the mix is shifting.</p>
                  </div>
                  <Repeat2 className="h-5 w-5 text-[#457b9d]" />
                </div>
                <div className="mt-5">
                  <div className="rounded-xl border border-[#d7e6f1] bg-[#f4f9fd] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#457b9d]">Returning Donors %</div>
                    <div className="mt-3 text-3xl font-bold text-[#1d4f74]">{returningDonorDisplay}</div>
                    <div className="mt-2 text-sm text-[#51718c]">
                      {fmt(donorSummary.returning)} of {fmt(donorSummary.totalDonors)} donors have given more than once.
                    </div>
                  </div>
                </div>
              </div>

            </section>
          </div>
        ) : null}
      </div>

      {sections.donorHealth ? (
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Social Contribution</h2>
              <p className="mt-1 text-sm text-gray-500">
                What is bringing donors in, without letting vanity metrics take over the page.
              </p>
            </div>
            <Link href="/superadmin/social-outreach">
              <button className="inline-flex items-center gap-1 text-sm font-semibold text-[#2a9d72] transition-colors hover:underline">
                View outreach <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-gray-100 bg-[#f8fbf9] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2a9d72]">Referrals Total</div>
                <div className="mt-1.5 text-4xl font-bold leading-none text-[#0e2118]">{fmt(socialSummary.totalReferrals)}</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f6ef]">
                <Share2 className="h-5 w-5 text-[#2a9d72]" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 border-t border-black/5 pt-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Referrals by Platform</div>
              {socialSummary.platformBreakdown.length > 0 ? (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={socialSummary.platformBreakdown} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis dataKey="platform" type="category" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(value: number) => [value, "Referrals"]} />
                      <Bar dataKey="referrals" radius={[0, 4, 4, 0]}>
                        {socialSummary.platformBreakdown.map((item, index) => (
                          <Cell key={item.platform} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 flex h-36 items-center justify-center text-sm text-gray-400">No referral data yet</div>
              )}
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Top Performing Content</div>
              {socialSummary.topPost ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">
                      {socialSummary.topPost.platform ?? "Platform"}
                    </span>
                    <span className="rounded-full bg-[#eef8f3] px-2.5 py-1 text-xs font-semibold text-[#2a9d72]">
                      {fmt(socialSummary.topPost.donationReferrals)} referrals
                    </span>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-[#fbfdfb] p-4">
                    <p className="line-clamp-3 text-sm leading-6 text-gray-700">
                      {socialSummary.topPost.content ?? socialSummary.topPost.caption ?? "No content preview available."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-[#f8fbf9] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Referral Value</div>
                        <div className="mt-1 text-base font-semibold text-gray-900">
                          {fmtPeso(socialSummary.topPost.estimatedDonationValuePhp)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Published</div>
                        <div className="mt-1 text-sm font-medium text-gray-700">
                          {socialSummary.topPost.postDate ?? socialSummary.topPost.createdAt ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex h-36 items-center justify-center text-sm text-gray-400">No top-performing post available</div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
