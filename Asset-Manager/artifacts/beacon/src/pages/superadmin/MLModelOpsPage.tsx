import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  CheckCircle, AlertTriangle, Clock, Activity, RefreshCw,
  Database, TrendingUp, Cpu,
} from "lucide-react";
import {
  useGetMlPipelines, useGetScoreDistribution,
  useGetBandDistribution, useGetFeatureImportance,
  type MlPipelineStatus,
} from "@/services/superadminMl.service";
import {
  BandBadge, LoadingState, ErrorState, EmptyState,
  SectionHeader, Card, FilterSelect, fmtRelativeDate, ACCENT, DARK, MINT,
} from "./ml/Shared";

const PIPELINE_DISPLAY: Record<string, string> = {
  donor_churn_risk: "Donor Churn Risk",
  donor_upgrade_potential: "Donor Upgrade Potential",
  donation_attribution: "Donation Attribution",
  campaign_effectiveness: "Campaign Effectiveness",
  social_conversion: "Social Post Conversion",
  resident_regression_risk: "Resident Regression Risk",
  reintegration_readiness: "Reintegration Readiness",
  safehouse_health: "Safehouse Health Score",
  intervention_effectiveness: "Intervention Effectiveness",
};

const FRESHNESS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  ok: { label: "Fresh", class: "bg-green-100 text-green-700", icon: CheckCircle },
  stale: { label: "Stale", class: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  "never-run": { label: "Never Run", class: "bg-gray-100 text-gray-500", icon: Clock },
};

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  completed: { label: "Completed", class: "bg-green-100 text-green-700" },
  failed: { label: "Failed", class: "bg-red-100 text-red-700" },
  running: { label: "Running", class: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", class: "bg-gray-100 text-gray-500" },
};

const SCORE_COLORS = [
  "#dcfce7", "#bbf7d0", "#86efac", "#4ade80",
  "#22c55e", ACCENT, "#16a34a", "#15803d", "#166534", "#14532d",
];

const BAND_CHART_COLORS = [ACCENT, "#f59e0b", "#ef4444", "#94a3b8", "#7bc5a6", "#457b9d", "#e9c46a"];

// ── Pipeline Status Table ─────────────────────────────────────────────────────

function PipelineStatusPanel({
  pipelines, onSelect, selectedPipeline,
}: {
  pipelines: MlPipelineStatus[];
  onSelect: (p: MlPipelineStatus) => void;
  selectedPipeline: MlPipelineStatus | null;
}) {
  return (
    <Card>
      <SectionHeader
        title="Pipeline Status"
        sub="All ML pipelines with run history, freshness indicators, and score statistics"
      />
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm min-w-[750px]">
          <thead>
            <tr className="border-b border-gray-100">
              {["Pipeline", "Last Run", "Status", "Freshness", "Scored", "Avg Score", "Range", ""].map(h => (
                <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pipelines.map(p => {
              const freshness = FRESHNESS_CONFIG[p.freshness] ?? FRESHNESS_CONFIG.ok;
              const FreshnessIcon = freshness.icon;
              const statusConf = STATUS_CONFIG[p.lastRunStatus ?? ""] ?? STATUS_CONFIG.pending;
              const isSelected = selectedPipeline?.pipelineName === p.pipelineName;

              return (
                <tr
                  key={p.pipelineName}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? "bg-teal-50/50" : ""}`}
                  onClick={() => onSelect(p)}
                >
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-gray-900 text-xs">
                      {p.displayName ?? PIPELINE_DISPLAY[p.pipelineName] ?? p.pipelineName}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{p.pipelineName}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-600 whitespace-nowrap">
                    {p.lastRunAt ? (
                      <>
                        <div>{fmtRelativeDate(p.lastRunAt)}</div>
                        {p.daysSinceLastRun != null && (
                          <div className="text-[10px] text-gray-400">{p.daysSinceLastRun}d ago</div>
                        )}
                      </>
                    ) : "Never"}
                  </td>
                  <td className="py-2.5 pr-4">
                    {p.lastRunStatus ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.class}`}>
                        {statusConf.label}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${freshness.class}`}>
                      <FreshnessIcon className="w-3 h-3" />
                      {freshness.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-700">
                    {p.scoredEntityCount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-semibold text-gray-900">
                    {p.avgScore != null ? `${(p.avgScore * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {p.minScore != null && p.maxScore != null
                      ? `${(p.minScore * 100).toFixed(0)}%–${(p.maxScore * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                  <td className="py-2.5 text-right text-xs text-[#2a9d72] font-medium">
                    {isSelected ? "Hide" : "Inspect"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Freshness Monitor ─────────────────────────────────────────────────────────

function FreshnessMonitor({ pipelines }: { pipelines: MlPipelineStatus[] }) {
  const fresh = pipelines.filter(p => p.freshness === "ok").length;
  const stale = pipelines.filter(p => p.freshness === "stale").length;
  const neverRun = pipelines.filter(p => p.freshness === "never-run").length;

  return (
    <Card>
      <SectionHeader title="Freshness Monitor" sub="Pipeline data currency overview" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Fresh", count: fresh, color: "#22c55e", icon: CheckCircle },
          { label: "Stale", count: stale, color: "#f59e0b", icon: AlertTriangle },
          { label: "Never Run", count: neverRun, color: "#94a3b8", icon: Clock },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="text-center p-3 rounded-lg" style={{ backgroundColor: `${color}12` }}>
            <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
            <div className="text-2xl font-bold" style={{ color }}>{count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {pipelines.map(p => {
          const freshness = FRESHNESS_CONFIG[p.freshness];
          const FreshnessIcon = freshness?.icon ?? Clock;
          const color = p.freshness === "ok" ? "#22c55e" : p.freshness === "stale" ? "#f59e0b" : "#94a3b8";
          return (
            <div key={p.pipelineName} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FreshnessIcon className="w-3 h-3" style={{ color }} />
                <span className="text-gray-700">
                  {p.displayName ?? PIPELINE_DISPLAY[p.pipelineName] ?? p.pipelineName}
                </span>
              </div>
              <span className="text-gray-400">
                {p.daysSinceLastRun != null ? `${p.daysSinceLastRun}d` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Score Distribution ────────────────────────────────────────────────────────

function ScoreDistributionPanel({ pipelineName }: { pipelineName: string }) {
  const { data, isLoading, error } = useGetScoreDistribution(pipelineName);
  const dist = data?.data;

  if (isLoading) return <LoadingState label="Loading score distribution…" />;
  if (error) return <ErrorState />;
  if (!dist) return <EmptyState label="No score data available for this pipeline" />;

  const chartData = dist.buckets.map(b => ({
    bucket: `${(b.bucket * 100).toFixed(0)}–${((b.bucket + 0.1) * 100).toFixed(0)}%`,
    count: b.count,
    fill: SCORE_COLORS[Math.floor(b.bucket * 10)] ?? ACCENT,
  }));

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
        Score Distribution — {dist.pipelineName.replace(/_/g, " ")}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ left: -15, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip
            formatter={(v: number) => [v, "Entities"]}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Band Distribution ─────────────────────────────────────────────────────────

function BandDistributionPanel({ pipelineName }: { pipelineName: string }) {
  const { data, isLoading, error } = useGetBandDistribution(pipelineName);
  const dist = data?.data;

  if (isLoading) return <LoadingState label="Loading band distribution…" />;
  if (error) return <ErrorState />;
  if (!dist) return <EmptyState label="No band data available" />;

  const total = dist.bands.reduce((s, b) => s + b.count, 0);
  const chartData = dist.bands.map((b, i) => ({
    band: b.bandLabel.replace(/-/g, " "),
    count: b.count,
    fill: BAND_CHART_COLORS[i % BAND_CHART_COLORS.length],
  }));

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
        Band Distribution — {dist.pipelineName.replace(/_/g, " ")}
      </div>
      <div className="space-y-2">
        {chartData.map(({ band, count, fill }) => {
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          return (
            <div key={band} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 capitalize">{band}</span>
                <span className="font-semibold text-gray-900">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: fill }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Feature Importance ────────────────────────────────────────────────────────

function FeatureImportancePanel({ runId }: { runId: number | null }) {
  const { data, isLoading, error } = useGetFeatureImportance(runId);
  const fi = data?.data;

  if (!runId) return <EmptyState label="Select a pipeline to view feature importance" />;
  if (isLoading) return <LoadingState label="Loading feature importance…" />;
  if (error) return <ErrorState />;
  if (!fi || !fi.featureImportanceJson || fi.featureImportanceJson.length === 0) {
    return <EmptyState label="No feature importance data for this run" />;
  }

  const maxImportance = Math.max(...fi.featureImportanceJson.map(f => f.importance));

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
        Feature Importance — {fi.displayName ?? fi.pipelineName.replace(/_/g, " ")} (Run #{fi.runId})
      </div>
      <div className="space-y-2.5">
        {fi.featureImportanceJson.slice(0, 10).map((f, i) => {
          const pct = ((f.importance / maxImportance) * 100).toFixed(1);
          const barPct = (f.importance / maxImportance * 100);
          return (
            <div key={f.feature} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{f.label ?? f.feature.replace(/_/g, " ")}</span>
                <span className="font-bold text-gray-900">{(f.importance * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: i === 0 ? DARK : i <= 2 ? ACCENT : MINT,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MLModelOpsPage() {
  const [filterFreshness, setFilterFreshness] = useState("");
  const [selectedPipeline, setSelectedPipeline] = useState<MlPipelineStatus | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useGetMlPipelines({
    freshness: filterFreshness || undefined,
  });

  const pipelines = data?.data ?? [];
  const selectedName = selectedPipeline?.pipelineName ?? null;
  const selectedRunId = selectedPipeline?.latestRunId ?? null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ML Control Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pipeline status, score distributions, band labels, and model feature importance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            value={filterFreshness}
            onChange={setFilterFreshness}
            options={[
              { value: "ok", label: "Fresh only" },
              { value: "stale", label: "Stale only" },
              { value: "never-run", label: "Never run" },
            ]}
            placeholder="All pipelines"
          />
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading ML pipelines…" />
      ) : error ? (
        <ErrorState label="Failed to load pipeline data" onRetry={refetch} />
      ) : pipelines.length === 0 ? (
        <EmptyState label="No pipelines found" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Pipelines",
                value: pipelines.length,
                icon: Database,
                color: DARK,
              },
              {
                label: "Fresh",
                value: pipelines.filter(p => p.freshness === "ok").length,
                icon: CheckCircle,
                color: "#22c55e",
              },
              {
                label: "Stale",
                value: pipelines.filter(p => p.freshness === "stale").length,
                icon: AlertTriangle,
                color: "#f59e0b",
              },
              {
                label: "Total Scored",
                value: pipelines.reduce((s, p) => s + (p.scoredEntityCount ?? 0), 0).toLocaleString(),
                icon: TrendingUp,
                color: ACCENT,
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
                  <div className="font-bold text-gray-900">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <PipelineStatusPanel
            pipelines={pipelines}
            onSelect={p => setSelectedPipeline(prev => prev?.pipelineName === p.pipelineName ? null : p)}
            selectedPipeline={selectedPipeline}
          />

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <FreshnessMonitor pipelines={pipelines} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {selectedPipeline ? (selectedPipeline.displayName ?? selectedPipeline.pipelineName.replace(/_/g, " ")) : "Select a Pipeline"}
                </span>
              </div>
              {!selectedPipeline && (
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <EmptyState label="Click a pipeline in the table above to inspect scores" />
                </div>
              )}
            </div>
          </div>

          {selectedPipeline && (
            <div className="grid lg:grid-cols-3 gap-4">
              <Card>
                <ScoreDistributionPanel pipelineName={selectedName!} />
              </Card>
              <Card>
                <BandDistributionPanel pipelineName={selectedName!} />
              </Card>
              <Card>
                <FeatureImportancePanel runId={selectedRunId} />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
