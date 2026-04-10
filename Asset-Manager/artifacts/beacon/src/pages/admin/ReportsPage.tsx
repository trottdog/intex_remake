import { useMemo, useState } from "react";
import { useGetAdminReportsOverview, type AdminReportsOverview } from "@/services/admin.service";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DONATION_SERIES = [
  { key: "totalAmount", label: "Total Monetary", color: "#2a9d72" },
  { key: "recurringAmount", label: "Recurring", color: "#457b9d" },
  { key: "inKindEstimatedValue", label: "In-Kind Value", color: "#f4a261" },
] as const;

const SAFEHOUSE_METRICS = [
  { key: "compositeHealthScore", label: "Composite Health", color: "#2a9d72" },
  { key: "avgEducationProgress", label: "Education Progress", color: "#4f46e5" },
  { key: "avgHealthScore", label: "Health Score", color: "#e76f51" },
  { key: "activeResidents", label: "Active Residents", color: "#0f766e" },
  { key: "incidentCount", label: "Incident Load", color: "#b91c1c" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  Active: "#2a9d72",
  Closed: "#6b7280",
  Transferred: "#8b5cf6",
  Low: "#2a9d72",
  Medium: "#f4a261",
  High: "#e76f51",
  Critical: "#dc2626",
  "Not Started": "#cbd5e1",
  "On Hold": "#f59e0b",
  "In Progress": "#60a5fa",
  Completed: "#16a34a",
};

function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("en-PH");
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatPercent(value: number | null | undefined, digits = 1) {
  return `${(value ?? 0).toFixed(digits)}%`;
}

function Section({
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#d7e8df] bg-white/90 shadow-[0_20px_60px_-32px_rgba(14,33,24,0.35)]">
      <div className="flex flex-col gap-4 border-b border-[#e3efe8] px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2a9d72]">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-bold text-[#11251a]">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#4d6357]">{description}</p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dbe8e1] bg-[#f8fcfa] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6e8478]">{label}</span>
        <Icon className="h-4 w-4 text-[#2a9d72]" />
      </div>
      <div className="text-3xl font-black leading-none text-[#102218]">{value}</div>
      <div className="mt-2 text-xs text-[#6a7d73]">{sublabel}</div>
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading, error } = useGetAdminReportsOverview();
  const [donationMetric, setDonationMetric] = useState<(typeof DONATION_SERIES)[number]["key"]>("totalAmount");
  const [comparisonMetric, setComparisonMetric] = useState<(typeof SAFEHOUSE_METRICS)[number]["key"]>("compositeHealthScore");

  const donationSeries = DONATION_SERIES.find((series) => series.key === donationMetric) ?? DONATION_SERIES[0];
  const comparisonSeries = SAFEHOUSE_METRICS.find((series) => series.key === comparisonMetric) ?? SAFEHOUSE_METRICS[0];

  const donationTrends = data?.donationTrends ?? [];
  const caseStatus = data?.residentOutcomes?.caseStatus ?? [];
  const riskDistribution = data?.residentOutcomes?.riskDistribution ?? [];
  const reintegrationStatuses = data?.residentOutcomes?.reintegrationStatus ?? [];
  const educationTrend = data?.educationMetrics?.monthlyTrend ?? [];
  const healthTrend = data?.healthMetrics?.monthlyTrend ?? [];
  const safehouseComparisons = useMemo(() => {
    const rows = data?.safehouseComparisons ?? [];
    return rows.map((item) => ({
      ...item,
      value: Number(item[comparisonMetric as keyof typeof item] ?? 0),
    }));
  }, [comparisonMetric, data?.safehouseComparisons]);
  const reintegrationComparisons = data?.reintegrationComparisons ?? [];

  const accomplishmentHighlights = useMemo(() => {
    const safehouseName = data?.scope?.primarySafehouseName ?? "your safehouse";
    return [
      `Raised ${formatCurrency(data?.summary?.totalDonationsRaised)} across ${formatNumber(data?.summary?.donationCount)} donations for ${safehouseName}.`,
      `Maintained ${formatNumber(data?.summary?.activeResidents)} active resident cases with ${formatNumber(data?.summary?.processRecordings)} process recordings and ${formatNumber(data?.summary?.homeVisitations)} home visitations logged.`,
      `Education indicators averaged ${formatPercent(data?.summary?.avgEducationProgress)} progress and ${formatPercent(data?.summary?.avgAttendanceRate)} attendance across scoped resident records.`,
      `Health and wellbeing records averaged ${Number(data?.summary?.avgHealthScore ?? 0).toFixed(2)} for general health and ${Number(data?.summary?.avgNutritionScore ?? 0).toFixed(2)} for nutrition quality.`,
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2a9d72]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <BarChart3 className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Reports are unavailable right now</h1>
        <p className="mt-2 text-sm text-gray-500">
          The reports workspace could not load its reporting dataset. Check the admin reports endpoint and try again.
        </p>
      </div>
    );
  }

  const generatedAt = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unavailable";

  return (
    <div className="space-y-8 pb-6">
      <section className="overflow-hidden rounded-[32px] border border-[#d7e8df] bg-[linear-gradient(135deg,#f7fbf9_0%,#eef6f1_48%,#fdfdfb_100%)] shadow-[0_24px_80px_-42px_rgba(14,33,24,0.45)]">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.45fr_0.9fr] lg:px-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2a9d72]">Annual Accomplishment View</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#0f2117]">
              Safehouse performance, resident outcomes, and support trends in one reporting surface.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#53695e]">
              This workspace is scoped to {data.scope?.primarySafehouseName ?? "your assigned safehouse"} for operational metrics,
              while comparison sections intentionally benchmark against peer safehouses for performance and reintegration context.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-full border border-[#cfe3d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#255741]">
                Scope: {(data.scope?.scopedSafehouseNames ?? []).join(", ") || "Assigned safehouse"}
              </div>
              <div className="rounded-full border border-[#cfe3d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5d7367]">
                Reporting window: {data.scope?.reportWindowMonths ?? 12} months
              </div>
              <div className="rounded-full border border-[#cfe3d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5d7367]">
                Refreshed: {generatedAt}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#d8e8df] bg-white/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6c8478]">Reporting Note</p>
                <h2 className="mt-2 text-lg font-bold text-[#11251a]">Accomplishment Summary</h2>
              </div>
              <FileSpreadsheet className="h-5 w-5 text-[#2a9d72]" />
            </div>
            <div className="mt-4 space-y-3">
              {accomplishmentHighlights.map((item) => (
                <div key={item} className="border-l-2 border-[#2a9d72]/40 pl-3 text-sm leading-6 text-[#4d6357]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={TrendingUp}
          label="Donations Raised"
          value={formatCurrency(data.summary?.totalDonationsRaised)}
          sublabel={`${formatNumber(data.summary?.donationCount)} donations recorded`}
        />
        <MetricTile
          icon={Users}
          label="Active Residents"
          value={formatNumber(data.summary?.activeResidents)}
          sublabel={`${formatNumber(data.summary?.highRiskResidents)} high-risk cases currently flagged`}
        />
        <MetricTile
          icon={GraduationCap}
          label="Education Progress"
          value={formatPercent(data.summary?.avgEducationProgress)}
          sublabel={`${formatPercent(data.summary?.avgAttendanceRate)} average attendance rate`}
        />
        <MetricTile
          icon={HeartPulse}
          label="Health Score"
          value={Number(data.summary?.avgHealthScore ?? 0).toFixed(2)}
          sublabel={`${formatPercent(data.summary?.reintegrationCompletionRate)} reintegration completion rate`}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.45fr_0.95fr]">
        <Section
          eyebrow="Funding Performance"
          title="Donation trends over time"
          description="Interactive donation reporting for your scoped safehouse, including monetary revenue, recurring giving, and in-kind value over the trailing year."
          aside={
            <div className="flex flex-wrap gap-2">
              {DONATION_SERIES.map((series) => (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => setDonationMetric(series.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    donationMetric === series.key
                      ? "bg-[#11251a] text-white"
                      : "border border-[#d6e6dd] bg-white text-[#567165] hover:border-[#9ecab3]"
                  }`}
                >
                  {series.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={donationTrends} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="donationFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor={donationSeries.color} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={donationSeries.color} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e3efe8" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 18, borderColor: "#d9e9df", boxShadow: "0 18px 40px -28px rgba(14,33,24,0.45)" }}
                    formatter={(value: number) => [formatCurrency(value), donationSeries.label]}
                  />
                  <Area
                    type="monotone"
                    dataKey={donationSeries.key}
                    stroke={donationSeries.color}
                    fill="url(#donationFill)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#dbe8e1] bg-[#f8fcfa] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b8176]">Recurring Giving</p>
                <p className="mt-2 text-2xl font-black text-[#102218]">{formatNumber(data.summary?.recurringDonationCount)}</p>
                <p className="mt-1 text-xs text-[#60756a]">Recurring commitments logged inside the reporting window.</p>
              </div>
              <div className="rounded-2xl border border-[#dbe8e1] bg-[#f8fcfa] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b8176]">In-Kind Value</p>
                <p className="mt-2 text-2xl font-black text-[#102218]">{formatCurrency(data.summary?.inKindDonationValue)}</p>
                <p className="mt-1 text-xs text-[#60756a]">Estimated PHP value of non-cash support recorded for this safehouse scope.</p>
              </div>
              <div className="rounded-2xl border border-[#dbe8e1] bg-[#102218] p-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Latest Month</p>
                <p className="mt-2 text-lg font-bold">{donationTrends[donationTrends.length - 1]?.period ?? "No data"}</p>
                <p className="mt-1 text-sm text-white/80">
                  {formatCurrency(donationTrends[donationTrends.length - 1]?.[donationMetric] as number | undefined)} in the selected donation measure.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Resident Outcomes"
          title="Case movement and risk profile"
          description="Resident outcome metrics are specific to your safehouse scope and emphasize case movement, reintegration stage, and current risk exposure."
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fcfa] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6d8378]">New Admissions This Quarter</p>
                <p className="mt-2 text-2xl font-black text-[#102218]">{formatNumber(data.residentOutcomes?.newAdmissionsThisQuarter)}</p>
              </div>
              <div className="rounded-2xl bg-[#f8fcfa] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6d8378]">Cases Closed This Quarter</p>
                <p className="mt-2 text-2xl font-black text-[#102218]">{formatNumber(data.residentOutcomes?.casesClosedThisQuarter)}</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6d8378]">Case Status Distribution</p>
              <div className="space-y-3">
                {caseStatus.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[#233a2d]">{item.status}</span>
                      <span className="font-bold text-[#0f2117]">{formatNumber(item.count)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#e7f0eb]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${data.summary?.totalResidents ? (item.count / data.summary.totalResidents) * 100 : 0}%`,
                          backgroundColor: STATUS_COLORS[item.status] ?? "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-[200px] rounded-2xl bg-[#f8fcfa] p-3">
                <p className="mb-2 text-xs font-semibold text-[#41584c]">Risk Distribution</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistribution}>
                    <CartesianGrid stroke="#e3efe8" vertical={false} />
                    <XAxis dataKey="level" tick={{ fontSize: 11, fill: "#5b7065" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5b7065" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#d9e9df" }} />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                      {riskDistribution.map((item) => (
                        <Cell key={item.level} fill={STATUS_COLORS[item.level] ?? "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl bg-[#f8fcfa] p-4">
                <p className="mb-3 text-xs font-semibold text-[#41584c]">Reintegration Stages</p>
                <div className="space-y-3">
                  {reintegrationStatuses.map((item) => (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-[#233a2d]">{item.status}</span>
                        <span className="font-bold text-[#0f2117]">{formatNumber(item.count)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#e7f0eb]">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${data.summary?.totalResidents ? (item.count / data.summary.totalResidents) * 100 : 0}%`,
                            backgroundColor: STATUS_COLORS[item.status] ?? "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section
          eyebrow="Education Progress"
          title="Monthly learning movement"
          description="Education progress metrics are derived from resident education records in your safehouse scope and follow the education progress and attendance fields defined in the schema."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricTile
              icon={GraduationCap}
              label="Average Progress"
              value={formatPercent(data.educationMetrics?.avgProgressPercent)}
              sublabel="Average completion progress across education records"
            />
            <MetricTile
              icon={ShieldCheck}
              label="Attendance"
              value={formatPercent(data.educationMetrics?.avgAttendanceRate)}
              sublabel="Rolling attendance rate converted to percent"
            />
            <MetricTile
              icon={Activity}
              label="Completions"
              value={formatNumber(data.educationMetrics?.completedCount)}
              sublabel={`${formatNumber(data.educationMetrics?.inProgressCount)} records still in progress`}
            />
          </div>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={educationTrend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e3efe8" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#d9e9df" }} />
                <Legend />
                <Line type="monotone" dataKey="avgProgressPercent" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} name="Progress %" />
                <Line type="monotone" dataKey="avgAttendanceRate" stroke="#2a9d72" strokeWidth={3} dot={{ r: 3 }} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section
          eyebrow="Health Improvement"
          title="Wellbeing movement over recent months"
          description="Health improvement metrics use the health and wellbeing scoring fields from resident monthly records, including general health, nutrition, sleep, and energy."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricTile
              icon={HeartPulse}
              label="General Health"
              value={Number(data.healthMetrics?.avgGeneralHealthScore ?? 0).toFixed(2)}
              sublabel={`Delta ${Number(data.healthMetrics?.improvementDelta ?? 0) >= 0 ? "+" : ""}${Number(data.healthMetrics?.improvementDelta ?? 0).toFixed(2)} over six months`}
            />
            <MetricTile
              icon={TrendingUp}
              label="Medical Coverage"
              value={formatPercent(data.healthMetrics?.medicalCoverageRate)}
              sublabel={`${formatPercent(data.healthMetrics?.dentalCoverageRate)} dental and ${formatPercent(data.healthMetrics?.psychologicalCoverageRate)} psychological coverage`}
            />
          </div>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthTrend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e3efe8" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#d9e9df" }} />
                <Legend />
                <Line type="monotone" dataKey="avgGeneralHealthScore" stroke="#2a9d72" strokeWidth={3} dot={{ r: 3 }} name="General Health" />
                <Line type="monotone" dataKey="avgNutritionScore" stroke="#f4a261" strokeWidth={2.5} dot={{ r: 3 }} name="Nutrition" />
                <Line type="monotone" dataKey="avgSleepScore" stroke="#457b9d" strokeWidth={2.5} dot={{ r: 3 }} name="Sleep" />
                <Line type="monotone" dataKey="avgEnergyScore" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section
        eyebrow="Peer Benchmark"
        title="Safehouse performance comparison"
        description="This comparison section intentionally includes all safehouses so admin users can see how their own location stacks up against peers on shared operational metrics."
        aside={
          <div className="flex flex-wrap gap-2">
            {SAFEHOUSE_METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => setComparisonMetric(metric.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  comparisonMetric === metric.key
                    ? "bg-[#11251a] text-white"
                    : "border border-[#d6e6dd] bg-white text-[#567165] hover:border-[#9ecab3]"
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
          <div className="h-[180px] xl:h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safehouseComparisons} layout="vertical" margin={{ top: 6, right: 12, left: 20, bottom: 6 }}>
                <CartesianGrid stroke="#e3efe8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="safehouseName"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "#61766b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#d9e9df" }} />
                <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                  {safehouseComparisons.map((row) => (
                    <Cell key={row.safehouseId} fill={row.isPrimary ? comparisonSeries.color : `${comparisonSeries.color}88`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-[190px] space-y-3 overflow-y-auto pr-2">
            {safehouseComparisons.map((row) => (
              <div
                key={row.safehouseId}
                className={`rounded-2xl border px-3 py-2.5 ${
                  row.isPrimary ? "border-[#9dc9b2] bg-[#f4fbf7]" : "border-[#dde9e2] bg-[#fbfdfc]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#11251a]">{row.safehouseName}</p>
                      {row.isPrimary ? (
                        <span className="rounded-full bg-[#11251a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Your safehouse
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#61766b]">{row.region ?? "Region not specified"} · {row.month ?? "Latest available metric"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#102218]">{Number(row.value ?? 0).toFixed(comparisonMetric === "activeResidents" || comparisonMetric === "incidentCount" ? 0 : 1)}</p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b8176]">{comparisonSeries.label}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#5f7469]">
                  <div>Utilization: {formatPercent(row.capacityUtilization)}</div>
                  <div>Peer rank: {row.peerRank ?? "N/A"}</div>
                  <div>Residents: {formatNumber(row.activeResidents)}</div>
                  <div>Incidents: {formatNumber(row.incidentCount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Reintegration Success"
        title="Safehouse reintegration success rates"
        description="These rates are intentionally shown across safehouses so your admin team can benchmark reintegration completion against peers while keeping other report sections scoped to your own safehouse."
      >
        <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <div className="h-[170px] xl:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reintegrationComparisons} layout="vertical" margin={{ top: 6, right: 12, left: 20, bottom: 6 }}>
                <CartesianGrid stroke="#e3efe8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#61766b" }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="safehouseName"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "#61766b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 16, borderColor: "#d9e9df" }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Success rate"]}
                />
                <Bar dataKey="successRate" radius={[0, 12, 12, 0]}>
                  {reintegrationComparisons.map((row) => (
                    <Cell key={row.safehouseId} fill={row.isPrimary ? "#2a9d72" : "#99cdb8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-[180px] space-y-3 overflow-y-auto pr-2">
            {reintegrationComparisons.map((row) => (
              <div
                key={row.safehouseId}
                className={`rounded-2xl border px-3 py-2.5 ${
                  row.isPrimary ? "border-[#9dc9b2] bg-[#f4fbf7]" : "border-[#dde9e2] bg-[#fbfdfc]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#11251a]">{row.safehouseName}</p>
                      {row.isPrimary ? (
                        <span className="rounded-full bg-[#11251a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Your safehouse
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#61766b]">{formatNumber(row.completedCount)} completed of {formatNumber(row.totalResidents)} residents</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-[#2a9d72]">
                    {formatPercent(row.successRate)}
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#e7f0eb]">
                  <div className="h-2 rounded-full bg-[#2a9d72]" style={{ width: `${Math.min(row.successRate ?? 0, 100)}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[10px] text-[#5f7469]">
                  <div className="rounded-xl bg-white px-2 py-1.5">
                    <div className="font-bold text-[#102218]">{formatNumber(row.notStarted)}</div>
                    <div>Not Started</div>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-1.5">
                    <div className="font-bold text-[#102218]">{formatNumber(row.onHold)}</div>
                    <div>On Hold</div>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-1.5">
                    <div className="font-bold text-[#102218]">{formatNumber(row.inProgress)}</div>
                    <div>In Progress</div>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-1.5">
                    <div className="font-bold text-[#102218]">{formatNumber(row.completed)}</div>
                    <div>Completed</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
