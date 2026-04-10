import { useState } from "react";
import { useGetDonorDashboardSummary, type DonorRecentSnapshot } from "@/services/donor.service";
import { useGetRecurringStatus, useToggleRecurring } from "@/services/donations.service";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Heart, DollarSign, Calendar, TrendingUp, Award,
  Loader2, AlertTriangle, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { QuickDonateModal } from "@/components/donor/QuickDonateModal";

const PALETTE = ["#2a9d72", "#0e2118", "#457b9d", "#e9c46a", "#f4a261", "#e76f51"];

function fmt(n: number | null | undefined, prefix = "₱") {
  if (!n) return `${prefix}0`;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${n.toLocaleString()}`;
  return `${prefix}${n.toFixed(2)}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";

  // Keep calendar dates stable for DATE-only values (YYYY-MM-DD) across time zones.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.trim());
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
    return localDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

type KpiProps = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  trend?: string;
};

function KpiCard({ label, value, sub, icon: Icon, accent = "#2a9d72", trend }: KpiProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-0.5">{label}</div>
      </div>
      {sub && <div className="text-xs text-gray-500 border-t border-gray-50 pt-2">{sub}</div>}
    </div>
  );
}

const CustomAreaTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      <div className="text-[#2a9d72] font-bold">{fmt(payload[0].value)}</div>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <div className="font-semibold text-gray-700">{payload[0].name}</div>
      <div className="text-[#2a9d72] font-bold">{fmt(payload[0].value)}</div>
    </div>
  );
};

function SnapCard({ snap, fmtDate }: { snap: DonorRecentSnapshot; fmtDate: (d: string | null | undefined) => string }) {
  const metrics = (snap.metricPayloadJson ?? {}) as Record<string, unknown>;
  const kpiItems = [
    { label: "Residents Served", value: metrics.residentsServed != null ? String(metrics.residentsServed) : undefined },
    { label: "Reintegrations", value: metrics.reintegrations != null ? String(metrics.reintegrations) : undefined },
    { label: "Donations Raised", value: metrics.donationsRaised != null ? `₱${Number(metrics.donationsRaised).toLocaleString()}` : undefined },
    { label: "Programs Active", value: metrics.programsActive != null ? String(metrics.programsActive) : undefined },
  ].filter(k => k.value !== undefined) as { label: string; value: string }[];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2a9d72]" />
            <span className="text-xs text-gray-500">
              {snap.snapshotDate ? fmtDate(snap.snapshotDate) : "—"}
            </span>
          </div>
          <h4 className="font-bold text-gray-900 text-sm leading-snug">{snap.headline ?? "Impact Report"}</h4>
        </div>
      </div>
      {snap.summaryText && (
        <p className="text-xs text-gray-500 leading-relaxed mb-4">{snap.summaryText}</p>
      )}
      {kpiItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {kpiItems.map(k => (
            <div key={k.label} className="bg-[#f8faf9] rounded-xl p-3">
              <div className="text-base font-black text-[#0e2118]">{String(k.value)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImpactReportsSection({ snapshots, fmtDate }: { snapshots: DonorRecentSnapshot[]; fmtDate: (d: string | null | undefined) => string }) {
  const recent = snapshots.slice(0, 2);
  const older = snapshots.slice(2);
  const [selectedId, setSelectedId] = useState<number | "">("");

  const selectedSnap = selectedId !== "" ? snapshots.find(s => s.snapshotId === selectedId) ?? null : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-800">Impact Reports</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{snapshots.length} available</span>
        </div>
        {older.length > 0 && (
          <label htmlFor="older-impact-reports" className="sr-only">Browse older impact reports</label>
        )}
        {older.length > 0 && (
          <select
            id="older-impact-reports"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value === "" ? "" : Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 cursor-pointer"
          >
            <option value="">Browse older reports ({older.length} more)...</option>
            {older.filter(s => s.snapshotId != null).map(s => (
              <option key={s.snapshotId!} value={s.snapshotId!}>
                {s.headline ?? "Impact Report"}{s.snapshotDate ? ` — ${fmtDate(s.snapshotDate)}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {recent.map(snap => (
          <SnapCard key={snap.snapshotId} snap={snap} fmtDate={fmtDate} />
        ))}
      </div>

      {selectedSnap && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-500 px-2">Selected report</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <div className="md:w-1/2">
            <SnapCard snap={selectedSnap} fmtDate={fmtDate} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DonorDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useGetDonorDashboardSummary();
  const { data: recurringData } = useGetRecurringStatus();
  const { mutate: toggleRecurring, isPending: togglingRecurring } = useToggleRecurring();
  const [donateOpen, setDonateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2a9d72]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
          <p className="font-medium">Unable to load your donor portal</p>
          <p className="text-sm text-gray-500 mt-1">Please refresh or contact support</p>
        </div>
      </div>
    );
  }

  const snapshots = data.recentSnapshots ?? [];
  const givingTrend = (data.givingTrend ?? []).filter(p => p.amount > 0 || true);
  const allocation = data.allocationBreakdown ?? [];
  const recent = data.recentDonations ?? [];

  const firstName = user?.firstName ?? "Donor";

  return (
    <div className="space-y-7">

      <QuickDonateModal open={donateOpen} onClose={() => setDonateOpen(false)} defaultRecurring={recurringData?.recurringEnabled ?? false} />

      {/* ── WELCOME BANNER ────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#f0faf5] via-[#e8f5ee] to-[#f0faf5] border border-[#c8e6d4] rounded-2xl overflow-hidden p-7 shadow-sm">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2a9d72] rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#2a9d72] rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-[#2a9d72]" />
              <span className="text-[#2a9d72] text-sm font-semibold tracking-wide uppercase">Donor Portal</span>
            </div>
            <h1 className="text-2xl font-black text-[#0e2118] leading-tight">
              Welcome back, {firstName}.
            </h1>
            <p className="text-gray-500 text-sm mt-2 max-w-md">
              Your generosity is actively sheltering, healing, and restoring lives in the Philippines.
              Here is the real impact your contributions are making.
            </p>
            <button
              onClick={() => setDonateOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] transition-colors shadow-sm"
            >
              <Heart className="w-4 h-4" />
              Donate Now
            </button>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 text-right shrink-0">
            <div className="text-3xl font-black text-[#0e2118]">{fmt(data.lifetimeGiving)}</div>
            <div className="text-gray-500 text-xs uppercase tracking-widest">Lifetime Contributions</div>
            {data.donationCount && data.donationCount > 0 && (
              <div className="text-gray-500 text-xs mt-1">
                {data.donationCount} gift{data.donationCount !== 1 ? "s" : ""} to date
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RECURRING DONATION TOGGLE ─────────────────────────────── */}
      <div className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border transition-colors ${
        recurringData?.recurringEnabled
          ? "bg-[#f0faf5] border-[#c8e6d4]"
          : "bg-white border-gray-100"
      } shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${recurringData?.recurringEnabled ? "bg-[#2a9d72]/15" : "bg-gray-100"}`}>
            <RefreshCw className={`w-4 h-4 ${recurringData?.recurringEnabled ? "text-[#2a9d72]" : "text-gray-500"}`} />
          </div>
          <div>
            <div className="text-sm font-bold text-[#0e2118]">Monthly Recurring Donations</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {recurringData?.recurringEnabled
                ? "You are enrolled as a monthly recurring donor. Thank you!"
                : "Turn on to automatically give every month and sustain our mission."}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={togglingRecurring}
          onClick={() => toggleRecurring(!(recurringData?.recurringEnabled ?? false))}
          role="switch"
          aria-checked={recurringData?.recurringEnabled ?? false}
          aria-label="Toggle monthly recurring donations"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
            recurringData?.recurringEnabled ? "bg-[#2a9d72]" : "bg-gray-200"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${recurringData?.recurringEnabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Lifetime Giving"
          value={fmt(data.lifetimeGiving)}
          icon={DollarSign}
          accent="#2a9d72"
          sub={`${data.donationCount ?? 0} total donations`}
        />
        <KpiCard
          label="Given This Year"
          value={fmt(data.givingThisYear)}
          icon={TrendingUp}
          accent="#457b9d"
          sub={`${new Date().getFullYear()} total`}
        />
        <KpiCard
          label="Last Donation"
          value={fmtDate(data.lastDonationDate)}
          icon={Calendar}
          accent="#e9c46a"
          sub={data.lastDonationAmount ? `Amount: ${fmt(data.lastDonationAmount)}` : undefined}
        />
        <KpiCard
          label="Campaigns Supported"
          value={String(data.campaignsSupported ?? 0)}
          icon={Award}
          accent="#e76f51"
          sub="Unique campaigns"
        />
      </div>

      {/* ── GIVING TREND + ALLOCATIONS ────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Area chart — giving trend */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Your Giving Trend</h2>
            <span className="text-xs text-gray-500">Last 12 months</span>
          </div>
          <p className="text-xs text-gray-500 mb-5">Monthly donation amounts (₱ PHP)</p>
          {givingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={givingTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2a9d72" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2a9d72" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v === 0 ? "" : `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2a9d72"
                  strokeWidth={2.5}
                  fill="url(#areaGreen)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: "#2a9d72" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
              No giving data for this period
            </div>
          )}
        </div>

        {/* Donut chart — allocation breakdown */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-1">
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Where Gifts Go</h2>
            <p className="text-xs text-gray-500 mt-0.5">Program area allocation</p>
          </div>
          {allocation.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="amount"
                    nameKey="programArea"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {allocation.map((item, i) => (
                  <div key={item.programArea} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="text-xs text-gray-600 flex-1 truncate">{item.programArea}</span>
                    <span className="text-xs font-bold text-gray-800">{item.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
              Allocations tracked after processing
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT DONATIONS ─────────────────────────────────────── */}
      <div>

        {/* Recent donations */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Recent Donations</h2>
              <p className="text-xs text-gray-500 mt-0.5">Your latest contributions on record</p>
            </div>
            <DollarSign className="w-4 h-4 text-gray-300" />
          </div>
          {recent.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recent.map((d, i) => (
                <div key={d.donationId ?? i} className="px-6 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2a9d72]/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-[#2a9d72]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {d.campaignName ?? "General Donation"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {fmtDate(d.donationDate)} · {d.channelSource ?? "direct"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#0e2118]">
                      {fmt(d.amount ?? 0)}
                    </div>
                    <div className="text-xs text-gray-500">{d.currencyCode ?? "PHP"}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-gray-300 text-sm">
              No donation history yet
            </div>
          )}
        </div>

      </div>

      {/* ── IMPACT REPORTS ───────────────────────────────────────── */}
      {snapshots.length > 0 && (
        <ImpactReportsSection snapshots={snapshots} fmtDate={fmtDate} />
      )}

    </div>
  );
}
