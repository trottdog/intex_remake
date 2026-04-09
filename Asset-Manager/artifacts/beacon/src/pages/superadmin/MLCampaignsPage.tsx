import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  useGetCampaignEffectiveness, useGetSocialHeatmap,
  useGetSocialRecommendation, useGetSocialPosts,
  usePatchCampaignMlFlags,
  type CampaignEffectivenessItem, type SocialPostItem,
} from "@/services/superadminMl.service";
import {
  BandBadge, ScoreBar, LoadingState, ErrorState, EmptyState,
  SectionHeader, Card, TabBar, DateRangeSelector,
  FilterSelect, SideDrawer, Pagination, ActionButton,
  fmtPeso, fmtDate, fmtRelativeDate, ACCENT, DARK, MINT,
} from "./ml/Shared";
import { PipelineCoveragePanel, PipelineInterpretationNotice } from "./ml/PipelineCoveragePanel";

type Tab = "campaigns" | "social";

const TABS: { id: Tab; label: string }[] = [
  { id: "campaigns", label: "Campaign Effectiveness" },
  { id: "social", label: "Social Post Planner" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Campaign Effectiveness Tab ────────────────────────────────────────────────

const CATEGORY_OPTS = [
  { value: "fundraising", label: "Fundraising" },
  { value: "awareness", label: "Awareness" },
  { value: "community", label: "Community" },
];

const STATUS_OPTS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
];

const BAND_COLORS: Record<string, string> = {
  high: ACCENT,
  moderate: "#f59e0b",
  low: "#ef4444",
  noise: "#94a3b8",
};

function CampaignEffectivenessTab() {
  const [dateRange, setDateRange] = useState("90d");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignEffectivenessItem | null>(null);

  const { data, isLoading, error, refetch } = useGetCampaignEffectiveness({
    dateRange, category: category || undefined, status: status || undefined,
  });
  const patchCampaign = usePatchCampaignMlFlags();

  const campaigns = data?.data ?? [];

  const chartData = campaigns.map(c => ({
    title: c.title.length > 16 ? c.title.slice(0, 16) + "…" : c.title,
    conversionRatio: c.conversionRatio != null ? +(c.conversionRatio * 100).toFixed(1) : 0,
    raised: parseFloat(c.totalRaisedPhp),
    band: c.classificationBand,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          title="Campaign Movement vs. Noise"
          sub="ML-scored campaigns by effectiveness classification — which are driving real fundraising vs. noise"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
              <FilterSelect value={category} onChange={setCategory} options={CATEGORY_OPTS} placeholder="All categories" />
              <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="All statuses" />
            </div>
          }
        />

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : campaigns.length === 0 ? (
          <EmptyState label="No campaigns found" />
        ) : (
          <div className="space-y-6">
            {chartData.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Conversion Ratio by Campaign
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [
                        name === "conversionRatio" ? `${v}%` : fmtPeso(v),
                        name === "conversionRatio" ? "Conversion" : "Raised",
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="conversionRatio" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={BAND_COLORS[entry.band ?? ""] ?? "#94a3b8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  {Object.entries(BAND_COLORS).map(([band, color]) => (
                    <div key={band} className="flex items-center gap-1 text-xs text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {band}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Campaign", "Status", "Effectiveness", "Band", "Raised / Goal", "Conversion", "Replicate?", ""].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.campaignId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-gray-900">{c.title}</div>
                        <div className="text-xs text-gray-400 capitalize">{c.category}</div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          c.status === "active" ? "bg-green-100 text-green-700" :
                          c.status === "completed" ? "bg-gray-100 text-gray-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 w-32">
                        {c.conversionRatio != null ? (
                          <ScoreBar score={c.conversionRatio} />
                        ) : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={c.classificationBand} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        <div>{fmtPeso(c.totalRaisedPhp)}</div>
                        <div className="text-gray-400">of {fmtPeso(c.goal)}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs font-semibold text-gray-800">
                        {c.conversionRatio != null ? `${(c.conversionRatio * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {c.recommendedReplicate != null ? (
                          <span className={`text-xs font-semibold ${c.recommendedReplicate ? "text-[#2a9d72]" : "text-gray-400"}`}>
                            {c.recommendedReplicate ? "Yes" : "No"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => setSelectedCampaign(prev => prev?.campaignId === c.campaignId ? null : c)}
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
          </div>
        )}
      </Card>

      <SideDrawer
        open={selectedCampaign !== null}
        onClose={() => setSelectedCampaign(null)}
        title={selectedCampaign?.title ?? "Campaign Detail"}
      >
        {selectedCampaign && (
          <div className="space-y-5">
            <div className="space-y-3">
              {[
                { label: "Category", value: selectedCampaign.category },
                { label: "Status", value: selectedCampaign.status },
                { label: "Goal", value: fmtPeso(selectedCampaign.goal) },
                { label: "Raised", value: fmtPeso(selectedCampaign.totalRaisedPhp) },
                { label: "Unique Donors", value: String(selectedCampaign.uniqueDonors) },
                { label: "Avg Engagement Rate", value: selectedCampaign.avgEngagementRate != null ? `${(selectedCampaign.avgEngagementRate * 100).toFixed(2)}%` : "—" },
                { label: "Total Impressions", value: selectedCampaign.totalImpressions?.toLocaleString() ?? "—" },
                { label: "Deadline", value: fmtDate(selectedCampaign.deadline) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-sm text-gray-900">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">ML Band</span>
                <BandBadge band={selectedCampaign.classificationBand} />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ML Actions</div>
              <ActionButton
                label="Flag: Avoid Replicating"
                onClick={() => patchCampaign.mutate({ id: selectedCampaign.campaignId, body: { recommendedAvoid: true } })}
                disabled={patchCampaign.isPending}
                variant="danger"
              />
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}

// ── Social Planner Tab ────────────────────────────────────────────────────────

const PLATFORM_OPTS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
];

const CONVERSION_BAND_OPTS = [
  { value: "high-converter", label: "High Converter" },
  { value: "moderate-converter", label: "Moderate" },
  { value: "low-converter", label: "Low Converter" },
];

const HOUR_LABELS: Record<number, string> = {
  6: "6am", 8: "8am", 10: "10am", 12: "12pm",
  14: "2pm", 16: "4pm", 18: "6pm", 20: "8pm", 22: "10pm",
};

function SocialPlannerTab() {
  const [dateRange, setDateRange] = useState("90d");
  const [platform, setPlatform] = useState("");
  const [conversionBand, setConversionBand] = useState("");
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<SocialPostItem | null>(null);

  const { data: heatmapData, isLoading: loadingHeatmap } = useGetSocialHeatmap({ platform: platform || undefined, dateRange });
  const { data: recData, isLoading: loadingRec } = useGetSocialRecommendation({ dateRange });
  const { data: postsData, isLoading: loadingPosts, error: postsError, refetch } = useGetSocialPosts({
    page, pageSize: 15, platform: platform || undefined,
    conversionBand: conversionBand || undefined, dateRange,
  });

  const posts = postsData?.data ?? [];
  const meta = postsData?.meta;
  const rec = recData?.data;
  const heatmap = heatmapData?.data;
  const insufficientData = (heatmapData as any)?.insufficientData;

  const heatmapMatrix: Record<string, number> = {};
  if (heatmap?.cells) {
    heatmap.cells.forEach(c => {
      heatmapMatrix[`${c.dayOfWeek}-${c.postHour}`] = c.avgDonationReferrals;
    });
  }

  const maxReferrals = heatmap?.cells
    ? Math.max(1, ...heatmap.cells.map(c => c.avgDonationReferrals))
    : 1;

  return (
    <div className="space-y-4">
      <PipelineInterpretationNotice
        title="Planning signal, not final proof"
        body="Best-posting-time and social-conversion outputs are routed here and are useful for planning, but notebook execution proof is still missing, so treat them as operational guidance rather than finalized evidence."
        tone="caution"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <DateRangeSelector value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} />
        <FilterSelect value={platform} onChange={v => { setPlatform(v); setPage(1); }} options={PLATFORM_OPTS} placeholder="All platforms" />
        <FilterSelect value={conversionBand} onChange={v => { setConversionBand(v); setPage(1); }} options={CONVERSION_BAND_OPTS} placeholder="All bands" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Best Posting Times" sub="Avg donation referrals by day and hour" />
          {loadingHeatmap ? (
            <LoadingState />
          ) : insufficientData ? (
            <EmptyState label="Insufficient data for heatmap (need 10+ posts)" />
          ) : !heatmap ? (
            <EmptyState label="No heatmap data available" />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[320px]">
                <div className="grid" style={{ gridTemplateColumns: "40px repeat(8, 1fr)" }}>
                  <div />
                  {[6, 8, 10, 12, 14, 16, 18, 20].map(h => (
                    <div key={h} className="text-[9px] text-gray-400 text-center pb-1">{HOUR_LABELS[h] ?? `${h}h`}</div>
                  ))}
                  {DAY_LABELS.map((day, dayIdx) => (
                    <div key={day} className="contents">
                      <div className="text-[9px] text-gray-400 flex items-center pr-2">{day}</div>
                      {[6, 8, 10, 12, 14, 16, 18, 20].map(hour => {
                        const val = heatmapMatrix[`${dayIdx}-${hour}`] ?? 0;
                        const intensity = val / maxReferrals;
                        return (
                          <div
                            key={hour}
                            className="aspect-square rounded-sm m-0.5"
                            style={{
                              backgroundColor: intensity > 0
                                ? `rgba(42,157,114,${Math.max(0.1, intensity)})`
                                : "#f1f5f9",
                            }}
                            title={`${day} ${HOUR_LABELS[hour] ?? `${hour}h`}: ${val.toFixed(1)} avg referrals`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400 justify-end">
                  <span>Low</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                      <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(42,157,114,${v})` }} />
                    ))}
                  </div>
                  <span>High</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Top Recommendation" sub="Highest-converting post template to replicate" />
          {loadingRec ? (
            <LoadingState />
          ) : !rec ? (
            <EmptyState label="No high-converting post recommendation available" />
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                <div className="flex items-center justify-between mb-2">
                  <BandBadge band={rec.conversionBand} />
                  <span className="text-xs text-gray-400">{rec.platform}</span>
                </div>
                {rec.caption && (
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                    "{rec.caption}"
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  {rec.mediaType && <span className="capitalize">{rec.mediaType}</span>}
                  {rec.contentTopic && <span>{rec.contentTopic}</span>}
                  {rec.postedAt && <span>{fmtDate(rec.postedAt)}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Predicted Referrals", value: rec.predictedReferralCount?.toLocaleString() ?? "—" },
                  { label: "Predicted Donation Value", value: fmtPeso(rec.predictedDonationValuePhp) },
                  { label: "Conversion Score", value: rec.conversionPredictionScore != null ? `${(rec.conversionPredictionScore * 100).toFixed(0)}%` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeader title="Post-Level Conversion Table" sub="All posts scored by conversion prediction model" />
        {loadingPosts ? (
          <LoadingState />
        ) : postsError ? (
          <ErrorState onRetry={refetch} />
        ) : posts.length === 0 ? (
          <EmptyState label="No posts found" />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Post / Caption", "Platform", "Conversion Score", "Band", "Pred. Referrals", "Pred. Value", "Actual vs Pred.", ""].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.postId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-4 max-w-xs">
                        <div className="text-xs text-gray-700 line-clamp-2">{p.caption ?? "—"}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{fmtDate(p.postedAt)}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs capitalize text-gray-600">{p.platform ?? "—"}</td>
                      <td className="py-2.5 pr-4 w-28">
                        <ScoreBar score={p.conversionPredictionScore} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={p.conversionBand} size="xs" />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        {p.predictedReferralCount?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        {fmtPeso(p.predictedDonationValuePhp)}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {p.predictedVsActualDelta != null ? (
                          <span className={p.predictedVsActualDelta >= 0 ? "text-green-600" : "text-red-500"}>
                            {p.predictedVsActualDelta >= 0 ? "+" : ""}{p.predictedVsActualDelta}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => setSelectedPost(prev => prev?.postId === p.postId ? null : p)}
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
            {meta && <Pagination page={page} total={meta.total} pageSize={15} onChange={setPage} />}
          </>
        )}
      </Card>

      <SideDrawer
        open={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
        title="Post Detail"
      >
        {selectedPost && (
          <div className="space-y-5">
            {selectedPost.caption && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800 leading-relaxed">
                "{selectedPost.caption}"
              </div>
            )}
            <div className="space-y-3">
              {[
                { label: "Platform", value: selectedPost.platform ?? "—" },
                { label: "Media Type", value: selectedPost.mediaType ?? "—" },
                { label: "Content Topic", value: selectedPost.contentTopic ?? "—" },
                { label: "Boosted", value: selectedPost.isBoosted ? "Yes" : "No" },
                { label: "Posted", value: fmtDate(selectedPost.postedAt) },
                { label: "Impressions", value: selectedPost.impressions?.toLocaleString() ?? "—" },
                { label: "Engagement Rate", value: selectedPost.engagementRate != null ? `${(selectedPost.engagementRate * 100).toFixed(2)}%` : "—" },
                { label: "Actual Referrals", value: selectedPost.donationReferrals?.toLocaleString() ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-sm text-gray-900 capitalize">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Conversion Band</span>
                <BandBadge band={selectedPost.conversionBand} />
              </div>
            </div>

            {selectedPost.conversionTopDrivers && selectedPost.conversionTopDrivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Conversion Drivers</div>
                <div className="space-y-1.5">
                  {selectedPost.conversionTopDrivers.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{d.label}</span>
                      <span className="font-semibold text-[#2a9d72]">{(d.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPost.conversionScoreUpdatedAt && (
              <div className="text-[10px] text-gray-400">
                Score updated {fmtRelativeDate(selectedPost.conversionScoreUpdatedAt)}
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MLCampaignsPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const defaultTab = (params.get("tab") as Tab) || "campaigns";
  const [tab, setTab] = useState<Tab>(["campaigns", "social"].includes(defaultTab) ? defaultTab : "campaigns");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [tab]);

  const coverageByTab: Record<Tab, { title: string; subtitle: string; pipelines: string[] }> = {
    campaigns: {
      title: "Campaign Coverage",
      subtitle: "Campaign effectiveness is an operational analysis surface; the reviewed predictive pipeline coverage on this page is primarily social.",
      pipelines: ["social_media_conversion", "best_posting_time"],
    },
    social: {
      title: "Social Planner Coverage",
      subtitle: "This route is the direct UI surface for both social conversion scoring and best-posting-time guidance.",
      pipelines: ["social_media_conversion", "best_posting_time"],
    },
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Direct routed views for social conversion and best-posting-time planning, alongside campaign-level fundraising analysis
        </p>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <PipelineCoveragePanel
        title={coverageByTab[tab].title}
        subtitle={coverageByTab[tab].subtitle}
        pipelineNames={coverageByTab[tab].pipelines}
      />

      {tab === "campaigns" && <CampaignEffectivenessTab />}
      {tab === "social" && <SocialPlannerTab />}
    </div>
  );
}
