import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import {
  useGetRegressionDistribution, useGetRegressionWatchlist,
  useGetReintegrationFunnel, useGetReintegrationTable,
  useGetInterventionEffectiveness, useGetInterventionPlans,
  useGetSafehouseHealth, useGetSafehouseHealthHistory,
  usePatchResidentAction,
  type RegressionWatchlistItem, type ReintegrationTableItem,
  type InterventionEffectivenessItem, type SafehouseHealthItem,
} from "@/services/superadminMl.service";
import {
  BandBadge, ScoreBar, LoadingState, ErrorState, EmptyState,
  PrivacyBanner, SectionHeader, Card, TabBar, DateRangeSelector,
  FilterSelect, SideDrawer, Pagination, ActionButton,
  fmtDate, fmtRelativeDate, ACCENT, DARK,
} from "./ml/Shared";
import { PipelineCoveragePanel, PipelineInterpretationNotice } from "./ml/PipelineCoveragePanel";

type Tab = "regression" | "reintegration" | "interventions" | "safehouses";

const TABS: { id: Tab; label: string }[] = [
  { id: "regression", label: "Regression Risk" },
  { id: "reintegration", label: "Reintegration Readiness" },
  { id: "interventions", label: "Intervention Effectiveness" },
  { id: "safehouses", label: "Safehouse Health" },
];

const BAND_OPTS_REG = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
  { value: "stable", label: "Stable" },
];

const BAND_OPTS_REINT = [
  { value: "ready", label: "Ready" },
  { value: "needs-support", label: "Needs Support" },
  { value: "not-ready", label: "Not Ready" },
];

const REGRESSION_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  moderate: "#f59e0b",
  low: "#22c55e",
  stable: "#94a3b8",
};

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

type RegressionDriverLike = {
  label?: string | null;
  feature?: string | null;
  name?: string | null;
  key?: string | null;
  weight?: number | null;
};

function normalizeRegressionDrivers(drivers: unknown): RegressionDriverLike[] {
  if (!Array.isArray(drivers)) return [];
  return drivers.filter((item): item is RegressionDriverLike => !!item && typeof item === "object");
}

function getDriverLabel(driver: RegressionDriverLike): string | null {
  const candidate = driver.label ?? driver.feature ?? driver.name ?? driver.key;
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getTopDriverLabel(row: RegressionWatchlistItem): string {
  const explicit = row.topDriverLabel?.trim();
  if (explicit) return explicit;

  const firstDerived = normalizeRegressionDrivers(row.regressionRiskDrivers)
    .map(getDriverLabel)
    .find((label): label is string => !!label);
  return firstDerived ?? "—";
}

// ── Regression Tab ────────────────────────────────────────────────────────────

function RegressionTab() {
  const [page, setPage] = useState(1);
  const [safehouseId, setSafehouseId] = useState("");
  const [regressionRiskBand, setRegressionRiskBand] = useState("");
  const [selectedResident, setSelectedResident] = useState<RegressionWatchlistItem | null>(null);

  const { data: distData, isLoading: loadingDist } = useGetRegressionDistribution({ safehouseId: safehouseId || undefined });
  const { data: watchData, isLoading: loadingWatch, error: watchError, refetch } = useGetRegressionWatchlist({
    page, pageSize: 15, safehouseId: safehouseId || undefined,
    regressionRiskBand: regressionRiskBand || undefined,
  });
  const patchResident = usePatchResidentAction();

  const distribution = distData?.data ?? [];
  const watchlist = watchData?.data ?? [];
  const watchMeta = watchData?.meta;

  const stackedData = distribution.map(sh => ({
    name: sh.safehouseName.split(" ").slice(-1)[0],
    critical: sh.bands.critical,
    high: sh.bands.high,
    moderate: sh.bands.moderate,
    low: sh.bands.low,
    stable: sh.bands.stable,
  }));

  return (
    <div className="space-y-4">
      {distData?.meta && <PrivacyBanner count={distData.meta.totalRestricted ?? 0} />}

      <Card>
        <SectionHeader
          title="Regression Risk Distribution"
          sub="Risk band breakdown per safehouse — restricted residents excluded from individual scoring"
        />
        {loadingDist ? (
          <LoadingState />
        ) : distribution.length === 0 ? (
          <EmptyState label="No distribution data available" />
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stackedData} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                {["critical", "high", "moderate", "low", "stable"].map(band => (
                  <Bar key={band} dataKey={band} stackId="a" fill={REGRESSION_COLORS[band]} name={band} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(REGRESSION_COLORS).map(([band, color]) => (
                <div key={band} className="flex items-center gap-1 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="capitalize">{band}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Regression Watchlist"
          sub="Residents flagged by the regression risk model — privacy-restricted residents are excluded"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <FilterSelect value={regressionRiskBand} onChange={v => { setRegressionRiskBand(v); setPage(1); }} options={BAND_OPTS_REG} placeholder="All bands" />
            </div>
          }
        />
        {watchMeta && <PrivacyBanner count={watchMeta.totalRestricted} />}

        {loadingWatch ? (
          <LoadingState />
        ) : watchError ? (
          <ErrorState onRetry={refetch} />
        ) : watchlist.length === 0 ? (
          <EmptyState label="No watchlist entries match the current filters" />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Resident", "Safehouse", "Risk Score", "Band", "Top Driver", "Action", ""].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map(r => (
                    <tr key={r.residentId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-gray-900 text-xs">{r.caseCode}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{r.caseCategory ?? "—"}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600">{r.safehouseName ?? "—"}</td>
                      <td className="py-2.5 pr-4 w-28">
                        <ScoreBar score={r.regressionRiskScore} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={r.regressionRiskBand} size="xs" />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600 max-w-[240px] align-top">
                        <span className="block whitespace-normal break-words leading-snug" title={getTopDriverLabel(r)}>
                          {getTopDriverLabel(r)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.regressionRecommendedAction ? (
                          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded capitalize">
                            {r.regressionRecommendedAction.replace(/-/g, " ")}
                          </span>
                        ) : (
                          <ActionButton
                            label="Flag Urgent"
                            onClick={() => patchResident.mutate({ id: r.residentId, body: { regressionRecommendedAction: "urgent-case-conference" } })}
                            disabled={patchResident.isPending}
                            variant="danger"
                          />
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedResident(prev => prev?.residentId === r.residentId ? null : r)}
                          className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {watchMeta && <Pagination page={page} total={watchMeta.total} pageSize={15} onChange={setPage} />}
          </>
        )}
      </Card>

      <SideDrawer open={selectedResident !== null} onClose={() => setSelectedResident(null)} title="Resident Detail">
        {selectedResident && (
          <div className="space-y-5">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-xs text-amber-800">Resident identity is anonymized to protect privacy. Only case codes and ML scores are shown.</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Case Code", value: selectedResident.caseCode },
                { label: "Category", value: selectedResident.caseCategory ?? "—" },
                { label: "Safehouse", value: selectedResident.safehouseName ?? "—" },
                { label: "Score Updated", value: fmtRelativeDate(selectedResident.regressionScoreUpdatedAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-sm text-gray-900">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Risk Band</span>
                <BandBadge band={selectedResident.regressionRiskBand} />
              </div>
            </div>
            {normalizeRegressionDrivers(selectedResident.regressionRiskDrivers).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Drivers</div>
                <div className="space-y-1.5">
                  {normalizeRegressionDrivers(selectedResident.regressionRiskDrivers).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{getDriverLabel(d) ?? "—"}</span>
                      <span className="font-semibold text-red-600">{typeof d.weight === "number" ? `${(d.weight * 100).toFixed(0)}%` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action</div>
              <div className="flex flex-wrap gap-2">
                {["urgent-case-conference", "monitor", "none"].map(action => (
                  <ActionButton
                    key={action}
                    label={action.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    onClick={() => patchResident.mutate({ id: selectedResident.residentId, body: { regressionRecommendedAction: action } })}
                    disabled={patchResident.isPending}
                    variant={selectedResident.regressionRecommendedAction === action ? "primary" : "default"}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}

// ── Reintegration Tab ─────────────────────────────────────────────────────────

function ReintegrationTab() {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState("90d");
  const [readinessBand, setReadinessBand] = useState("");
  const [selectedResident, setSelectedResident] = useState<ReintegrationTableItem | null>(null);

  const { data: funnelData, isLoading: loadingFunnel } = useGetReintegrationFunnel({ dateRange });
  const { data: tableData, isLoading: loadingTable, error: tableError, refetch } = useGetReintegrationTable({
    page, pageSize: 15, dateRange,
    reintegrationReadinessBand: readinessBand || undefined,
  });
  const patchResident = usePatchResidentAction();

  const funnel = funnelData?.data;
  const residents = tableData?.data ?? [];
  const tableMeta = tableData?.meta;

  const funnelMax = funnel ? Math.max(...funnel.stages.map(s => s.count), 1) : 1;

  return (
    <div className="space-y-4">
      {tableMeta && <PrivacyBanner count={tableMeta.totalRestricted} />}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Reintegration Funnel" sub="Pipeline stages from assessed to reintegrated" action={
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          } />
          {loadingFunnel ? (
            <LoadingState />
          ) : !funnel || funnel.stages.length === 0 ? (
            <EmptyState label="No funnel data available" />
          ) : (
            <div className="space-y-2">
              {funnel.stages.map(stage => {
                const pct = (stage.count / funnelMax) * 100;
                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium">{stage.label}</span>
                      <span className="font-bold text-gray-900">{stage.count}</span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${pct}%`, backgroundColor: ACCENT }}
                      />
                      {stage.count === 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">
                          No records
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {funnel.totalRestricted > 0 && (
                <div className="text-[10px] text-gray-400 mt-2">
                  {funnel.totalRestricted} privacy-restricted resident(s) excluded from Assessed and Eligible stages.
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Readiness Distribution" sub="Score breakdown overview" />
          {loadingFunnel ? (
            <LoadingState />
          ) : !funnel ? (
            <EmptyState />
          ) : (
            <div className="space-y-3 pt-2">
              {funnel.stages.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: [ACCENT, "#7bc5a6", "#f59e0b", DARK][i % 4] }}
                  />
                  <span className="text-xs text-gray-700 flex-1">{stage.label}</span>
                  <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {funnelMax > 0 ? ((stage.count / funnel.stages.reduce((s, x) => s + x.count, 0)) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeader
          title="Reintegration Readiness Table"
          sub="Ranked residents by reintegration readiness score — privacy-restricted records excluded"
          action={
            <FilterSelect value={readinessBand} onChange={v => { setReadinessBand(v); setPage(1); }} options={BAND_OPTS_REINT} placeholder="All bands" />
          }
        />
        {loadingTable ? (
          <LoadingState />
        ) : tableError ? (
          <ErrorState onRetry={refetch} />
        ) : residents.length === 0 ? (
          <EmptyState label="No residents match current filters" />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Resident", "Safehouse", "Readiness", "Band", "Top Positive", "Top Barrier", "Regression Band", ""].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {residents.map(r => (
                    <tr key={r.residentId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-gray-900 text-xs">{r.caseCode}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{r.caseCategory ?? "—"}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600">{r.safehouseName ?? "—"}</td>
                      <td className="py-2.5 pr-4 w-28">
                        <ScoreBar score={r.reintegrationReadinessScore} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={r.reintegrationReadinessBand} size="xs" />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-green-700 max-w-[140px]">
                        <span className="truncate block">{r.topPositiveIndicator ?? "—"}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-red-600 max-w-[140px]">
                        <span className="truncate block">{r.topBarrier ?? "—"}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={r.regressionRiskBand} size="xs" />
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedResident(prev => prev?.residentId === r.residentId ? null : r)}
                          className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableMeta && <Pagination page={page} total={tableMeta.total} pageSize={15} onChange={setPage} />}
          </>
        )}
      </Card>

      <SideDrawer open={selectedResident !== null} onClose={() => setSelectedResident(null)} title="Reintegration Detail">
        {selectedResident && (
          <div className="space-y-5">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-xs text-amber-800">Resident identity is anonymized. Case codes and ML scores only.</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Case Code", value: selectedResident.caseCode },
                { label: "Safehouse", value: selectedResident.safehouseName ?? "—" },
                { label: "Status", value: selectedResident.reintegrationStatus ?? "—" },
                { label: "Length of Stay", value: selectedResident.lengthOfStayDays != null ? `${selectedResident.lengthOfStayDays} days` : "—" },
                { label: "Score Updated", value: fmtRelativeDate(selectedResident.reintegrationScoreUpdatedAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-sm text-gray-900 capitalize">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Readiness Band</span>
                <BandBadge band={selectedResident.reintegrationReadinessBand} />
              </div>
            </div>
            {selectedResident.reintegrationReadinessDrivers && (
              <div className="space-y-3">
                {selectedResident.reintegrationReadinessDrivers.positive?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Positive Indicators</div>
                    <div className="space-y-1">
                      {selectedResident.reintegrationReadinessDrivers.positive.map((d, i) => (
                        <div key={i} className="text-xs text-gray-700">+ {d.label}</div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedResident.reintegrationReadinessDrivers.barriers?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Barriers</div>
                    <div className="space-y-1">
                      {selectedResident.reintegrationReadinessDrivers.barriers.map((d, i) => (
                        <div key={i} className="text-xs text-gray-700">- {d.label}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action</div>
              <div className="flex flex-wrap gap-2">
                {["schedule-conference", "prepare-plan", "monitor"].map(action => (
                  <ActionButton
                    key={action}
                    label={action.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    onClick={() => patchResident.mutate({ id: selectedResident.residentId, body: { reintegrationRecommendedAction: action } })}
                    disabled={patchResident.isPending}
                    variant={selectedResident.reintegrationRecommendedAction === action ? "primary" : "default"}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}

// ── Interventions Tab ─────────────────────────────────────────────────────────

const IMPACT_COLORS: Record<string, string> = {
  "high-impact": ACCENT,
  "moderate": "#f59e0b",
  "low-impact": "#ef4444",
  "insufficient-data": "#94a3b8",
};

function InterventionTab() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useGetInterventionEffectiveness();
  const { data: plansData, isLoading: loadingPlans } = useGetInterventionPlans(selectedCategory);

  const matrix = data?.data ?? [];
  const plans = plansData?.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          title="Intervention Effectiveness Matrix"
          sub="Aggregated effectiveness scores across completed intervention plans by category"
        />
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : matrix.length === 0 ? (
          <EmptyState label="No completed intervention plans with effectiveness scores" />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Category", "Plans", "Avg Effectiveness", "Health Delta", "Education Delta", "Completion Rate", "Distribution", ""].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(item => (
                    <tr
                      key={item.planCategory}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedCategory === item.planCategory ? "bg-teal-50/50" : ""}`}
                      onClick={() => setSelectedCategory(prev => prev === item.planCategory ? null : item.planCategory)}
                    >
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{item.planCategory}</td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600">{item.planCount}</td>
                      <td className="py-2.5 pr-4 w-28">
                        {item.avgEffectivenessScore != null ? (
                          <ScoreBar score={item.avgEffectivenessScore} />
                        ) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        {item.avgHealthScoreDelta != null ? `${item.avgHealthScoreDelta > 0 ? "+" : ""}${item.avgHealthScoreDelta.toFixed(1)}` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        {item.avgEducationProgressDelta != null ? `${item.avgEducationProgressDelta > 0 ? "+" : ""}${item.avgEducationProgressDelta.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        {item.avgSessionProgressRate != null ? `${(item.avgSessionProgressRate * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex gap-0.5 h-4 items-end">
                          {Object.entries(item.effectivenessBandDistribution).map(([band, count]) => (
                            <div
                              key={band}
                              title={`${band}: ${count}`}
                              className="flex-1 rounded-sm"
                              style={{
                                height: `${Math.max(20, (count / Math.max(1, item.planCount)) * 100)}%`,
                                backgroundColor: IMPACT_COLORS[band] ?? "#94a3b8",
                                minWidth: "4px",
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 text-xs text-[#2a9d72] font-medium text-right">
                        {selectedCategory === item.planCategory ? "Hide" : "Plans"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              {Object.entries(IMPACT_COLORS).map(([band, color]) => (
                <div key={band} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span>{band}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {selectedCategory && (
        <Card>
          <SectionHeader title={`Plans — ${selectedCategory}`} sub="Individual completed plans with full effectiveness data" />
          {loadingPlans ? (
            <LoadingState />
          ) : plans.length === 0 ? (
            <EmptyState label="No completed plans in this category" />
          ) : (
            <div className="space-y-2">
              {plans.map(p => (
                <div key={p.planId} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-800">{p.safehouseName ?? "Unknown Safehouse"}</span>
                    <BandBadge band={p.effectivenessBand} size="xs" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</span>
                    {p.effectivenessOutcomeScore != null && (
                      <span>Score: <strong className="text-gray-800">{(p.effectivenessOutcomeScore * 100).toFixed(0)}%</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Safehouses Tab ────────────────────────────────────────────────────────────

function SafehousesTab() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const { data, isLoading, error, refetch } = useGetSafehouseHealth();
  const { data: histData, isLoading: loadingHist } = useGetSafehouseHealthHistory(selectedId);

  const safehouses = data?.data ?? [];
  const history = histData?.data ?? [];
  const compareResult = safehouses.filter(sh => compareIds.includes(sh.safehouseId));

  function toggleCompare(id: number) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev.slice(-2), id]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {compareMode
            ? `Comparing ${compareIds.length} safehouse(s) — select up to 3`
            : "Click a safehouse for health history trend"}
        </div>
        <button
          onClick={() => { setCompareMode(v => !v); setCompareIds([]); setSelectedId(null); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            compareMode ? "bg-[#0e2118] text-white border-[#0e2118]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {compareMode ? "Exit Compare" : "Compare Mode"}
        </button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : safehouses.length === 0 ? (
        <EmptyState label="No safehouse health data available" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safehouses.map(sh => {
            const TrendIcon = TREND_ICONS[sh.trendDirection ?? ""] ?? Minus;
            const trendColor = TREND_COLORS[sh.trendDirection ?? ""] ?? "#94a3b8";
            const isSelected = selectedId === sh.safehouseId;
            const isCompared = compareIds.includes(sh.safehouseId);
            const scoreColor = sh.compositeHealthScore != null
              ? sh.compositeHealthScore >= 0.7 ? "#22c55e" : sh.compositeHealthScore >= 0.4 ? "#f59e0b" : "#ef4444"
              : "#94a3b8";

            return (
              <div
                key={sh.safehouseId}
                onClick={() => compareMode ? toggleCompare(sh.safehouseId) : setSelectedId(prev => prev === sh.safehouseId ? null : sh.safehouseId)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm ${
                  isSelected || isCompared
                    ? "border-[#2a9d72] ring-1 ring-[#2a9d72]"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{sh.safehouseName}</div>
                    {sh.region && <div className="text-xs text-gray-400">{sh.region}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    {sh.peerRank != null && (
                      <span className="text-[10px] font-bold text-gray-400">#{sh.peerRank}</span>
                    )}
                    <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                  </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Health Score</div>
                    <div className="text-2xl font-bold" style={{ color: scoreColor }}>
                      {sh.compositeHealthScore != null ? (sh.compositeHealthScore * 100).toFixed(0) : "—"}
                    </div>
                  </div>
                  <BandBadge band={sh.healthBand} />
                </div>

                {sh.incidentSeverityDistribution && (
                  <div className="flex gap-1 h-2 rounded overflow-hidden mt-2">
                    {Object.entries(sh.incidentSeverityDistribution).map(([level, count]) => {
                      const colors: Record<string, string> = {
                        critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e",
                      };
                      const total = Object.values(sh.incidentSeverityDistribution!).reduce((a, b) => a + b, 0);
                      if (count === 0 || total === 0) return null;
                      return (
                        <div
                          key={level}
                          className="rounded-sm"
                          style={{ width: `${(count / total) * 100}%`, backgroundColor: colors[level] ?? "#94a3b8" }}
                          title={`${level}: ${count}`}
                        />
                      );
                    })}
                  </div>
                )}

                {sh.healthScoreComputedAt && (
                  <div className="text-[10px] text-gray-400 mt-2">
                    Computed {fmtRelativeDate(sh.healthScoreComputedAt)}
                  </div>
                )}

                {compareMode && (
                  <div className={`mt-2 text-[10px] font-semibold text-center py-1 rounded ${
                    isCompared ? "bg-[#2a9d72] text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {isCompared ? "Selected for Compare" : "Click to Compare"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {compareMode && compareIds.length >= 2 && (
        <Card>
          <SectionHeader title={`Comparing ${compareIds.length} Safehouses`} />
          {compareResult.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Safehouse", "Score", "Band", "Peer Rank", "Trend", "Incidents"].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareResult.map(sh => {
                    const TrendIcon = TREND_ICONS[sh.trendDirection ?? ""] ?? Minus;
                    const trendColor = TREND_COLORS[sh.trendDirection ?? ""] ?? "#94a3b8";
                    return (
                      <tr key={sh.safehouseId} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{sh.safehouseName}</td>
                        <td className="py-2.5 pr-4 text-sm font-bold" style={{
                          color: sh.compositeHealthScore != null
                            ? sh.compositeHealthScore >= 0.7 ? "#22c55e" : sh.compositeHealthScore >= 0.4 ? "#f59e0b" : "#ef4444"
                            : "#94a3b8"
                        }}>
                          {sh.compositeHealthScore != null ? (sh.compositeHealthScore * 100).toFixed(0) : "—"}
                        </td>
                        <td className="py-2.5 pr-4"><BandBadge band={sh.healthBand} size="xs" /></td>
                        <td className="py-2.5 pr-4 text-xs text-gray-600">{sh.peerRank != null ? `#${sh.peerRank}` : "—"}</td>
                        <td className="py-2.5 pr-4">
                          <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                        </td>
                        <td className="py-2.5 text-xs text-gray-600">
                          {sh.incidentSeverityDistribution
                            ? Object.values(sh.incidentSeverityDistribution).reduce((a, b) => a + b, 0)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!compareMode && selectedId !== null && (
        <Card>
          <SectionHeader title="Health Score Trend" sub={`Historical trend for selected safehouse`} />
          {loadingHist ? (
            <LoadingState />
          ) : history.length === 0 ? (
            <EmptyState label="No historical data available" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history.map(h => ({
                month: (h as unknown as { monthStart?: string }).monthStart ?? h.metricMonth,
                score: h.compositeHealthScore != null ? +(h.compositeHealthScore * 100).toFixed(1) : null,
              }))} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}`} />
                <Tooltip
                  formatter={(v: number) => [`${v}`, "Health Score"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Line type="monotone" dataKey="score" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MLResidentsPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const defaultTab = (params.get("tab") as Tab) || "regression";
  const [tab, setTab] = useState<Tab>(["regression", "reintegration", "interventions", "safehouses"].includes(defaultTab) ? defaultTab : "regression");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [tab]);

  const coverageByTab: Record<Tab, { title: string; subtitle: string; pipelines: string[] }> = {
    regression: {
      title: "Regression Coverage",
      subtitle: "This route is the direct UI surface for resident risk scoring.",
      pipelines: ["resident_risk"],
    },
    reintegration: {
      title: "Reintegration Coverage",
      subtitle: "This route is the direct UI surface for reintegration readiness, with adjacent resident workflows around prioritization and visitation outcomes.",
      pipelines: ["reintegration_readiness", "case_prioritization", "home_visitation_outcome"],
    },
    interventions: {
      title: "Intervention Coverage",
      subtitle: "This tab supports intervention review, while counseling and education pipelines remain adjacent rather than standalone routed scoreboards.",
      pipelines: ["counseling_progress", "education_improvement"],
    },
    safehouses: {
      title: "Safehouse Coverage",
      subtitle: "Safehouse health is visible here as adjacent operational context, while capacity and resource pipelines should still be demonstrated through model ops with caveats.",
      pipelines: ["capacity_pressure", "resource_demand"],
    },
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resident Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Direct routed views for resident risk and reintegration readiness, with adjacent intervention and safehouse context
        </p>
      </div>

      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span className="text-xs text-blue-800">
          Resident data shown here is anonymized using case codes only. Privacy-restricted residents are excluded from all row-level ML views. Aggregate counts include all records.
        </span>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <PipelineCoveragePanel
        title={coverageByTab[tab].title}
        subtitle={coverageByTab[tab].subtitle}
        pipelineNames={coverageByTab[tab].pipelines}
      />

      {tab === "regression" && <RegressionTab />}
      {tab === "reintegration" && <ReintegrationTab />}
      {tab === "interventions" && <InterventionTab />}
      {tab === "safehouses" && <SafehousesTab />}
    </div>
  );
}
