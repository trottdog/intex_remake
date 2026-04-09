import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  CheckCircle, AlertTriangle, Clock, Activity, RefreshCw,
  Database, TrendingUp, Cpu, ExternalLink, Info,
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
import {
  PIPELINE_REVIEW_CATALOG,
  getPipelineCatalogEntry,
  type PipelineCaveatLevel,
  type PipelineEvidenceLevel,
} from "./ml/pipelineCatalog";

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

const EVIDENCE_CONFIG: Record<PipelineEvidenceLevel, { label: string; className: string }> = {
  direct: { label: "Direct route", className: "bg-green-100 text-green-700" },
  adjacent: { label: "Adjacent route", className: "bg-amber-100 text-amber-700" },
  model_ops: { label: "Model ops only", className: "bg-slate-100 text-slate-700" },
};

const CAVEAT_CONFIG: Record<PipelineCaveatLevel, { label: string; className: string }> = {
  normal: { label: "Standard", className: "bg-slate-100 text-slate-700" },
  caution: { label: "Needs caveat", className: "bg-amber-100 text-amber-700" },
  high: { label: "High caveat", className: "bg-red-100 text-red-700" },
};

const AUDIT_STATUS_CONFIG = {
  risk: { label: "Risk", className: "bg-red-100 text-red-700" },
} as const;

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

function AuditReadinessSummary() {
  return (
    <Card>
      <SectionHeader
        title="Audit Readiness"
        sub="Cross-pipeline findings from the current repository audit, focused on model-proof maturity rather than page wiring."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {[
          "Notebook executability proof is missing across the reviewed pipelines.",
          "Evaluate entrypoints are still effectively stubs instead of real repeatable validation commands.",
          "Validation depth is uneven, including unrealistic perfect regression performance signals in resource demand.",
          "Frontend integration exists for the reviewed pipeline set, but model-proof maturity is still below pass.",
        ].map(item => (
          <div key={item} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReviewedCoverageMatrix({ selectedPipelineName }: { selectedPipelineName: string | null }) {
  return (
    <Card>
      <SectionHeader
        title="Reviewed Pipeline Coverage"
        sub="Where each reviewed pipeline is actually visible in the routed app today, and which ones still depend on model-ops context."
      />
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Pipeline", "Family", "Coverage", "Audit", "Where to Demo", "Current Caveat"].map(header => (
                <th key={header} className="pb-2 pr-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PIPELINE_REVIEW_CATALOG.map(entry => {
              const isSelected = [entry.internalName, entry.publicName, ...(entry.aliases ?? [])].includes(selectedPipelineName ?? "");
              const evidence = EVIDENCE_CONFIG[entry.evidence];
              const caveat = CAVEAT_CONFIG[entry.caveat];
              const audit = AUDIT_STATUS_CONFIG[entry.auditStatus];

              return (
                <tr key={entry.internalName} className={`border-b border-gray-50 ${isSelected ? "bg-teal-50/50" : ""}`}>
                  <td className="py-3 pr-4 align-top">
                    <div className="font-medium text-gray-900 text-xs">{entry.displayName}</div>
                    <div className="mt-0.5 text-[10px] text-gray-400 font-mono">
                      {entry.internalName}
                      {entry.publicName !== entry.internalName ? ` -> ${entry.publicName}` : ""}
                    </div>
                  </td>
                  <td className="py-3 pr-4 align-top text-xs text-gray-600">
                    <div>{entry.family}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">{entry.taskType}</div>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${evidence.className}`}>
                      {evidence.label}
                    </span>
                    <div className="mt-2 max-w-[220px] text-xs leading-relaxed text-gray-500">{entry.summary}</div>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${audit.className}`}>
                      {audit.label}
                    </span>
                    <div className="mt-2 max-w-[220px] text-xs leading-relaxed text-gray-500">{entry.videoSafety}</div>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <div className="flex max-w-[240px] flex-wrap gap-1.5">
                      {entry.links.map(link => (
                        <a
                          key={`${entry.internalName}-${link.href}`}
                          href={link.href}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                        >
                          {link.label}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${caveat.className}`}>
                      {caveat.label}
                    </span>
                    <div className="mt-2 max-w-[260px] text-xs leading-relaxed text-gray-500">{entry.limitation}</div>
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

function SelectedPipelineContext({ pipeline }: { pipeline: MlPipelineStatus | null }) {
  if (!pipeline) {
    return <EmptyState label="Click a pipeline in the table above to inspect scores and route coverage" />;
  }

  const catalogEntry = getPipelineCatalogEntry(pipeline.pipelineName);
  const evidence = catalogEntry ? EVIDENCE_CONFIG[catalogEntry.evidence] : null;
  const caveat = catalogEntry ? CAVEAT_CONFIG[catalogEntry.caveat] : null;
  const audit = catalogEntry ? AUDIT_STATUS_CONFIG[catalogEntry.auditStatus] : null;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          {pipeline.displayName ?? PIPELINE_DISPLAY[pipeline.pipelineName] ?? pipeline.pipelineName}
        </div>
        <div className="mt-0.5 text-[10px] font-mono text-gray-400">{pipeline.pipelineName}</div>
      </div>

      {catalogEntry ? (
        <>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${audit?.className ?? "bg-slate-100 text-slate-700"}`}>
              {audit?.label ?? "Unreviewed"}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${evidence?.className ?? "bg-slate-100 text-slate-700"}`}>
              {evidence?.label ?? "Mapped"}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${caveat?.className ?? "bg-slate-100 text-slate-700"}`}>
              {caveat?.label ?? "Standard"}
            </span>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Route context
            </div>
            <div>{catalogEntry.summary}</div>
            <div className="mt-2 text-blue-800/90">{catalogEntry.limitation}</div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recommended Demo Paths</div>
            <div className="flex flex-col gap-2">
              {catalogEntry.links.map(link => (
                <a
                  key={`${catalogEntry.internalName}-${link.href}`}
                  href={link.href}
                  className="inline-flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Audit Summary</div>
            <div className="text-xs leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-800">Complete:</span> {catalogEntry.complete}
            </div>
            <div className="text-xs leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-800">Weak:</span> {catalogEntry.weak}
            </div>
            <div className="text-xs leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-800">Missing:</span> {catalogEntry.missing}
            </div>
            <div className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              <span className="font-semibold">Video safety:</span> {catalogEntry.videoSafety}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
          This pipeline is present in run-level model ops data, but it is not part of the reviewed routed coverage matrix yet.
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MLModelOpsPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const requestedPipeline = params.get("pipeline");
  const [filterFreshness, setFilterFreshness] = useState("");
  const [selectedPipeline, setSelectedPipeline] = useState<MlPipelineStatus | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useGetMlPipelines({
    freshness: filterFreshness || undefined,
  });

  const pipelines = data?.data ?? [];
  const selectedName = selectedPipeline?.pipelineName ?? null;
  const selectedRunId = selectedPipeline?.latestRunId ?? null;

  useEffect(() => {
    if (!requestedPipeline || pipelines.length === 0) return;
    const matched = pipelines.find(p => {
      if (p.pipelineName === requestedPipeline) return true;
      const entry = getPipelineCatalogEntry(p.pipelineName);
      return entry
        ? [entry.internalName, entry.publicName, ...(entry.aliases ?? [])].includes(requestedPipeline)
        : false;
    });
    if (matched && matched.pipelineName !== selectedPipeline?.pipelineName) {
      setSelectedPipeline(matched);
    }
  }, [pipelines, requestedPipeline, selectedPipeline?.pipelineName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedPipeline?.pipelineName) {
      url.searchParams.set("pipeline", selectedPipeline.pipelineName);
    } else {
      url.searchParams.delete("pipeline");
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [selectedPipeline?.pipelineName]);

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

          <AuditReadinessSummary />

          <PipelineStatusPanel
            pipelines={pipelines}
            onSelect={p => setSelectedPipeline(prev => prev?.pipelineName === p.pipelineName ? null : p)}
            selectedPipeline={selectedPipeline}
          />

          <ReviewedCoverageMatrix selectedPipelineName={selectedName} />

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
              <Card>
                <SelectedPipelineContext pipeline={selectedPipeline} />
              </Card>
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
