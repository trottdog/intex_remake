import { AlertTriangle, Bell, TrendingDown, TrendingUp, Minus, Award } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "wouter";
import {
  useGetActionQueue, useGetFundingGap, useGetSafehouseHealthMini,
} from "@/services/superadminMl.service";
import {
  BandBadge, LoadingState, ErrorState, fmtPeso, fmtRelativeDate,
  ACCENT, DARK,
} from "./ml/Shared";

// ── W01 — Action Queue Card ───────────────────────────────────────────────────

export function ActionQueueCard() {
  const { data, isLoading, error, refetch } = useGetActionQueue();
  const d = data?.data;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${DARK}18` }}>
            <Bell className="w-4 h-4" style={{ color: DARK }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">AI Action Queue</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Requires attention</p>
          </div>
        </div>
        <Link href="/superadmin/donors">
          <span className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium cursor-pointer transition-colors">View all</span>
        </Link>
      </div>

      {isLoading ? (
        <LoadingState label="Loading action queue…" />
      ) : error || !d ? (
        <ErrorState onRetry={refetch} />
      ) : (d.churnAlert.atRiskCount === 0 && d.regressionAlert.criticalOrHighCount === 0 && d.safehouseAlert.atRiskOrCriticalCount === 0) ? (
        <div className="py-6 text-center">
          <div className="text-[#2a9d72] font-medium text-sm">No urgent alerts at this time</div>
          <div className="text-xs text-gray-400 mt-1">All metrics within normal range</div>
        </div>
      ) : (
        <div className="space-y-3">
          {d.churnAlert.atRiskCount > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-red-800">Donor Churn Risk</span>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {d.churnAlert.atRiskCount} at-risk
                </span>
              </div>
              <div className="space-y-1">
                {d.churnAlert.topThree.map(s => (
                  <div key={s.supporterId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium truncate">{s.displayName}</span>
                    <BandBadge band={s.churnBand} size="xs" />
                  </div>
                ))}
              </div>
              <Link href="/superadmin/donors?tab=churn">
                <span className="block mt-2 text-[10px] text-red-600 hover:text-red-800 font-medium cursor-pointer">
                  Review donor churn list →
                </span>
              </Link>
            </div>
          )}

          {d.regressionAlert.criticalOrHighCount > 0 && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-800">Resident Regression Risk</span>
                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  {d.regressionAlert.criticalOrHighCount} critical/high
                </span>
              </div>
              <Link href="/superadmin/residents?tab=regression">
                <span className="block mt-2 text-[10px] text-orange-600 hover:text-orange-800 font-medium cursor-pointer">
                  Review resident watchlist →
                </span>
              </Link>
            </div>
          )}

          {d.safehouseAlert.atRiskOrCriticalCount > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-800">Safehouse Health Alert</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {d.safehouseAlert.atRiskOrCriticalCount} at-risk
                </span>
              </div>
              {d.safehouseAlert.safehouseNames.length > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  {d.safehouseAlert.safehouseNames.join(", ")}
                </div>
              )}
              <Link href="/superadmin/residents?tab=safehouses">
                <span className="block mt-2 text-[10px] text-amber-600 hover:text-amber-800 font-medium cursor-pointer">
                  Review safehouse health →
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── W02 — Funding Gap KPI + Sparkline ─────────────────────────────────────────

const GAP_BAND_COLORS: Record<string, string> = {
  "major-gap": "#ef4444",
  "minor-gap": "#f59e0b",
  "on-track": "#22c55e",
  "strong": ACCENT,
};

export function FundingGapCard() {
  const { data, isLoading, error, refetch } = useGetFundingGap();
  const d = data?.data;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Funding Gap (30-day)</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">ML-projected shortfall</p>
          </div>
        </div>
        <Link href="/superadmin/fundraising">
          <span className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium cursor-pointer transition-colors">Donations</span>
        </Link>
      </div>

      {isLoading ? (
        <LoadingState label="Loading funding gap…" />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : !d?.latestSnapshot ? (
        <div className="py-4 text-center text-sm text-gray-400">No funding gap snapshot available</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-end gap-3">
              <div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: GAP_BAND_COLORS[d.latestSnapshot.fundingGapBand] ?? "#374151" }}
                >
                  {fmtPeso(d.latestSnapshot.projectedGapPhp30d)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <BandBadge band={d.latestSnapshot.fundingGapBand} />
                  <span className="text-[10px] text-gray-400">
                    Updated {fmtRelativeDate(d.latestSnapshot.fundingGapUpdatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {d.sparkline.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Donation Trend</div>
              <ResponsiveContainer width="100%" height={70}>
                <AreaChart data={d.sparkline.map(s => ({ month: s.month, amount: parseFloat(s.totalDonationsPhp) }))}>
                  <defs>
                    <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    formatter={(v: number) => [fmtPeso(v), "Donations"]}
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="amount" stroke={ACCENT} strokeWidth={2} fill="url(#gapGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── W03 — Safehouse Health Leaderboard Mini ───────────────────────────────────

const TREND_ICONS: Record<string, React.ElementType> = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const TREND_COLORS: Record<string, string> = {
  improving: "#22c55e",
  declining: "#ef4444",
  stable: "#94a3b8",
};

export function SafehouseHealthMiniCard() {
  const { data, isLoading, error, refetch } = useGetSafehouseHealthMini();
  const items = data?.data ?? [];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ACCENT}18` }}>
            <Award className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Safehouse Health</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Peer-ranked leaderboard</p>
          </div>
        </div>
        <Link href="/superadmin/residents?tab=safehouses">
          <span className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium cursor-pointer transition-colors">Full view</span>
        </Link>
      </div>

      {isLoading ? (
        <LoadingState label="Loading health scores…" />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : items.length === 0 ? (
        <div className="py-4 text-center text-sm text-gray-400">No health data available</div>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 5).map((sh, idx) => {
            const TrendIcon = TREND_ICONS[sh.trendDirection ?? ""] ?? Minus;
            const trendColor = TREND_COLORS[sh.trendDirection ?? ""] ?? "#94a3b8";
            const score = sh.compositeHealthScore != null ? sh.compositeHealthScore : null;
            const scoreColor = score != null
              ? score >= 0.7 ? "#22c55e" : score >= 0.4 ? "#f59e0b" : "#ef4444"
              : "#94a3b8";

            return (
              <div key={sh.safehouseId} className="flex items-center gap-3">
                <div className="w-5 text-center">
                  {sh.peerRank != null ? (
                    <span className="text-xs font-bold text-gray-400">#{sh.peerRank}</span>
                  ) : (
                    <span className="text-xs text-gray-300">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{sh.safehouseName}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <BandBadge band={sh.healthBand} size="xs" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {score != null && (
                    <span className="text-sm font-bold" style={{ color: scoreColor }}>
                      {(score * 100).toFixed(0)}
                    </span>
                  )}
                  <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
                </div>
              </div>
            );
          })}
          {items.length > 5 && (
            <div className="pt-1">
              <Link href="/superadmin/residents?tab=safehouses">
                <span className="text-xs text-[#2a9d72] hover:underline cursor-pointer">
                  +{items.length - 5} more safehouses
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Composite overview widget ─────────────────────────────────────────────────

export function MLOverviewSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[#2a9d72]" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">AI Intelligence</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActionQueueCard />
        <FundingGapCard />
        <SafehouseHealthMiniCard />
      </div>
    </div>
  );
}
