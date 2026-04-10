import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useGetExecutiveDashboardSummary,
} from "@/services/superadmin.service";
import { useListSocialMediaPosts } from "@/services";
import { useListResidents } from "@/services/residents.service";
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
  Building2,
  Clock3,
  DollarSign,
  Loader2,
  Repeat2,
  Share2,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCENT = "#2a9d72";
const DARK = "#0e2118";

const PLATFORM_COLORS = ["#2a9d72", "#0e2118", "#7bc5a6", "#457b9d", "#e9c46a"];

type ProcessRecordingItem = {
  recordingId?: number | null;
  residentId?: number | null;
  residentCode?: string | null;
  sessionDate?: string | null;
  socialWorker?: string | null;
  progressNoted?: boolean | null;
  concernsFlagged?: boolean | null;
};

function fmt(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

function fmtPeso(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPercent(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-PH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
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

function KpiCard({
  label,
  value,
  icon: Icon,
  color = ACCENT,
  emphasis = false,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  const className = `block w-full rounded-xl border p-5 text-left transition-all ${
    emphasis
      ? onClick
        ? "border-red-100 bg-white hover:border-red-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a9d72]/30"
        : "border-red-100 bg-white"
      : onClick
        ? "border-gray-100 bg-white hover:border-[#2a9d72]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a9d72]/30"
        : "border-gray-100 bg-white"
  }`;

  const content = (
    <>
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
    </>
  );

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} aria-label={`Open ${label}`} className={className}>
      {content}
    </button>
  );
}

function ChartPanel({
  title,
  onClick,
  children,
  className = "",
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const panelClassName = `block w-full rounded-xl border border-gray-100 bg-white p-5 text-left transition-all ${onClick ? "hover:border-[#2a9d72]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a9d72]/30" : ""} ${className}`;

  if (!onClick) {
    return <div className={panelClassName}>{children}</div>;
  }

  return (
    <button type="button" onClick={onClick} aria-label={`Open ${title}`} className={panelClassName}>
      {children}
    </button>
  );
}

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const safehouseId: number | null = null;
  const months = 12;

  const { data, isLoading, error, refetch } = useGetExecutiveDashboardSummary({ safehouseId, months });
  const { data: residentsData } = useListResidents({ pageSize: 200, safehouseId: safehouseId ?? undefined, caseStatus: "active" });
  const { data: socialPostsData } = useListSocialMediaPosts({ pageSize: 200 });
  const { data: recordingsData } = useQuery<{ data: ProcessRecordingItem[]; total: number }>({
    queryKey: ["process-recordings", "dashboard", safehouseId ?? "all"],
    queryFn: () => apiFetch(`/api/process-recordings?pageSize=500${safehouseId ? `&safehouseId=${safehouseId}` : ""}`),
  });

  const activeResidents = residentsData?.data ?? [];
  const socialPosts = socialPostsData?.data ?? [];
  const processRecordings = recordingsData?.data ?? [];

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

  const dashboardKpis = useMemo(() => {
    const survivorsInCare = data?.activeResidents ?? data?.totalActiveResidents ?? activeResidents.length;
    const casesAtRisk = data?.highRiskResidents ?? 0;
    const totalDonations = data?.totalDonations ?? data?.donationsYtd ?? null;
    const returningDonorsPct = data?.orgRetentionEstimate ?? null;

    return {
      survivorsInCare,
      casesAtRisk,
      totalDonations,
      returningDonorsPct,
    };
  }, [activeResidents.length, data?.activeResidents, data?.highRiskResidents, data?.orgRetentionEstimate, data?.donationsYtd, data?.totalActiveResidents, data?.totalDonations]);

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
    return { totalReferrals, platformBreakdown };
  }, [socialPosts]);

  const goTo = (path: string) => () => {
    setLocation(path);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }
  };

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

  return (
    <div className="space-y-8 pb-8">
      <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Survivors in Care" value={fmt(dashboardKpis.survivorsInCare)} icon={Users} onClick={goTo("/superadmin/caseload")} />
        <KpiCard
          label="Cases at Risk"
          value={fmt(dashboardKpis.casesAtRisk)}
          icon={AlertTriangle}
          color="#dc2626"
          emphasis={dashboardKpis.casesAtRisk > 0}
        />
        <KpiCard label="Total Donations" value={fmtPeso(dashboardKpis.totalDonations)} icon={DollarSign} onClick={goTo("/superadmin/fundraising")} />
        <KpiCard label="Returning Donors %" value={fmtPercent(dashboardKpis.returningDonorsPct)} icon={Repeat2} color="#457b9d" onClick={goTo("/superadmin/donors?tab=churn")} />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Cases Needing Attention</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "No Recent Update",
              value: careGapSignals.noRecentUpdateCount,
              icon: Clock3,
              toneAlert: "border-amber-200 bg-amber-50 text-amber-800",
              toneCalm: "border-gray-200 bg-white text-gray-500",
              href: "/superadmin/case-management?tab=recordings",
            },
            {
              label: "Missing Assigned Support",
              value: careGapSignals.missingAssignedSupportCount,
              icon: UserX,
              toneAlert: "border-red-200 bg-red-50 text-red-800",
              toneCalm: "border-gray-200 bg-white text-gray-500",
              href: "/superadmin/residents",
            },
            {
              label: "Stalled Progress",
              value: careGapSignals.stalledProgressCount,
              icon: TrendingUp,
              toneAlert: "border-orange-200 bg-orange-50 text-orange-800",
              toneCalm: "border-gray-200 bg-white text-gray-500",
              href: "/superadmin/case-management?tab=plans",
            },
            {
              label: "Capacity Pressure",
              value: careGapSignals.overCapacitySafehouseCount,
              icon: Building2,
              toneAlert: "border-[#bfe2cc] bg-[#eef8f3] text-[#2a9d72]",
              toneCalm: "border-gray-200 bg-white text-gray-500",
            },
          ].map((item) => {
            const active = item.value > 0;
            const cardClassName = `block w-full rounded-xl border p-4 text-left transition-colors ${item.href ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a9d72]/30" : ""} ${
              active ? `${item.toneAlert} border-[1.5px]` : item.toneCalm
            }`;
            const content = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "" : "text-gray-400"}`}>
                    {item.label}
                  </span>
                  <item.icon className={`h-4 w-4 ${active ? "" : "text-gray-300"}`} />
                </div>
                <div className={`mt-3 font-bold ${active ? "text-4xl" : "text-3xl text-gray-500"}`}>{fmt(item.value)}</div>
              </>
            );

            if (!item.href) {
              return <div key={item.label} className={cardClassName}>{content}</div>;
            }

            return (
              <button
                type="button"
                key={item.label}
                onClick={goTo(item.href)}
                aria-label={`Open ${item.label}`}
                className={cardClassName}
              >
                {content}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Reintegration Progress</h2>
        <ChartPanel title="reintegration progress" className="min-h-[320px]">
          {reintegrationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
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
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No reintegration data</div>
          )}
        </ChartPanel>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Donor Health & Retention</h2>
        <ChartPanel title="donor health and retention" onClick={goTo("/superadmin/donors?tab=churn")}>
          <h3 className="text-sm font-semibold text-gray-900">Donation Trend</h3>
          {(data.donationTrend ?? []).length > 0 ? (
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
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">No donation trend data</div>
          )}
        </ChartPanel>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Social Contribution</h2>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <KpiCard label="Referrals Total" value={fmt(socialSummary.totalReferrals)} icon={Share2} onClick={goTo("/superadmin/campaigns?tab=social")} />
          <ChartPanel title="social contribution by platform" onClick={goTo("/superadmin/campaigns?tab=social")}>
            <h3 className="text-sm font-semibold text-gray-900">Referrals by Platform</h3>
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
          </ChartPanel>
        </div>
      </section>
    </div>
  );
}
