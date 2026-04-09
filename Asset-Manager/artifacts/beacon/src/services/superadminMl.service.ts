import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, apiPatch } from "./api";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ActionQueueData {
  churnAlert: { atRiskCount: number; topThree: { supporterId: number; displayName: string; churnBand: string }[] };
  regressionAlert: { criticalOrHighCount: number };
  safehouseAlert: { atRiskOrCriticalCount: number; safehouseNames: string[] };
}

export interface FundingGapData {
  latestSnapshot: {
    projectedGapPhp30d: string;
    fundingGapBand: string;
    fundingGapUpdatedAt: string;
    snapshotDate: string;
  } | null;
  sparkline: { month: string; totalDonationsPhp: string }[];
}

export interface SafehouseHealthMiniItem {
  safehouseId: number;
  safehouseName: string;
  compositeHealthScore: number | null;
  peerRank: number | null;
  healthBand: string | null;
  trendDirection: string | null;
  metricMonth: string | null;
}

export interface DonorChurnItem {
  supporterId: number;
  displayName: string;
  email: string;
  totalDonationsPhp: string;
  lastDonationDate: string | null;
  daysSinceLastDonation: number | null;
  churnRiskScore: number | null;
  churnBand: string | null;
  churnTopDrivers: { label: string; weight: number }[] | null;
  churnRecommendedAction: string | null;
  churnScoreUpdatedAt: string | null;
}

export interface DonorChurnMeta {
  page: number;
  pageSize: number;
  total: number;
  totalAtRisk: number;
  totalRestricted: number;
}

export interface DonorUpgradeItem {
  supporterId: number;
  displayName: string;
  email: string;
  totalDonationsPhp: string;
  avgDonationPhp: string;
  lastDonationDate: string | null;
  upgradeLikelihoodScore: number | null;
  upgradeBand: string | null;
  upgradeTopDrivers: { label: string; weight: number }[] | null;
  upgradeRecommendedAskBand: string | null;
  upgradeScoreUpdatedAt: string | null;
}

export interface DonorDonationRecent {
  donationId: number;
  amount: string;
  donationDate: string;
  channel: string | null;
  campaignTitle: string | null;
  attributedOutcomeScore: number | null;
}

export interface AttributionSankeyNode {
  id: string;
  label: string;
  type: "channel" | "campaign" | "safehouse" | "program";
}

export interface AttributionSankeyLink {
  source: string;
  target: string;
  value: number;
  avgOutcomeScore: number | null;
}

export interface AttributionProgramItem {
  programArea: string;
  totalAllocatedPhp: string;
  avgAttributedOutcomeScore: number | null;
  safehouseCount: number;
  healthScoreDelta: number | null;
  educationProgressDelta: number | null;
}

export interface CampaignEffectivenessItem {
  campaignId: number;
  title: string;
  category: string;
  status: string;
  goal: string;
  totalRaisedPhp: string;
  uniqueDonors: number;
  avgEngagementRate: number | null;
  totalImpressions: number | null;
  conversionRatio: number | null;
  classificationBand: string | null;
  recommendedReplicate: boolean | null;
  deadline: string | null;
}

export interface SocialHeatmapCell {
  dayOfWeek: string;
  postHour: number;
  avgDonationReferrals: number;
  postCount: number;
}

export interface SocialRecommendation {
  postId: number;
  caption: string | null;
  platform: string | null;
  mediaType: string | null;
  contentTopic: string | null;
  conversionPredictionScore: number | null;
  conversionBand: string | null;
  predictedReferralCount: number | null;
  predictedDonationValuePhp: string | null;
  postedAt: string | null;
}

export interface SocialPostItem {
  postId: number;
  caption: string | null;
  platform: string | null;
  mediaType: string | null;
  postType: string | null;
  contentTopic: string | null;
  isBoosted: boolean | null;
  postedAt: string | null;
  impressions: number | null;
  engagementRate: number | null;
  donationReferrals: number | null;
  conversionPredictionScore: number | null;
  conversionBand: string | null;
  predictedReferralCount: number | null;
  predictedDonationValuePhp: string | null;
  predictedVsActualDelta: number | null;
  conversionTopDrivers: { label: string; weight: number }[] | null;
  conversionComparablePostIds: number[] | null;
  conversionScoreUpdatedAt: string | null;
}

export interface RegressionDistributionItem {
  safehouseId: number;
  safehouseName: string;
  bands: { critical: number; high: number; moderate: number; low: number; stable: number };
  totalScored: number;
  totalRestricted: number;
}

export interface RegressionWatchlistItem {
  residentId: number;
  caseCode: string;
  caseCategory: string | null;
  safehouseName: string | null;
  regressionRiskScore: number | null;
  regressionRiskBand: string | null;
  regressionRiskDrivers: { label: string; weight: number }[] | null;
  regressionRecommendedAction: string | null;
  regressionScoreUpdatedAt: string | null;
  topDriverLabel: string | null;
}

export interface ReintegrationFunnelData {
  stages: { stage: string; count: number; label: string }[];
  totalRestricted: number;
}

export interface ReintegrationTableItem {
  residentId: number;
  caseCode: string;
  caseCategory: string | null;
  safehouseName: string | null;
  reintegrationStatus: string | null;
  reintegrationReadinessScore: number | null;
  reintegrationReadinessBand: string | null;
  reintegrationReadinessDrivers: { positive: { label: string }[]; barriers: { label: string }[] } | null;
  reintegrationRecommendedAction: string | null;
  reintegrationScoreUpdatedAt: string | null;
  topPositiveIndicator: string | null;
  topBarrier: string | null;
  regressionRiskBand: string | null;
  lengthOfStayDays: number | null;
}

export interface InterventionEffectivenessItem {
  planCategory: string;
  planCount: number;
  avgEffectivenessScore: number | null;
  avgHealthScoreDelta: number | null;
  avgEducationProgressDelta: number | null;
  avgSessionProgressRate: number | null;
  effectivenessBandDistribution: { "high-impact": number; moderate: number; "low-impact": number; "insufficient-data": number };
}

export interface InterventionPlanDetail {
  planId: number;
  planCategory: string;
  safehouseName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  effectivenessOutcomeScore: number | null;
  effectivenessBand: string | null;
  effectivenessOutcomeDrivers: unknown | null;
  effectivenessScoreUpdatedAt: string | null;
}

export interface SafehouseHealthItem {
  safehouseId: number;
  safehouseName: string;
  region: string | null;
  compositeHealthScore: number | null;
  peerRank: number | null;
  healthBand: string | null;
  trendDirection: string | null;
  healthScoreDrivers: unknown | null;
  incidentSeverityDistribution: { critical: number; high: number; medium: number; low: number } | null;
  healthScoreComputedAt: string | null;
  metricMonth: string | null;
}

export interface SafehouseHealthHistory {
  metricMonth: string;
  compositeHealthScore: number | null;
  healthBand: string | null;
  trendDirection: string | null;
  peerRank: number | null;
}

export interface MlPipelineStatus {
  pipelineName: string;
  displayName: string;
  lastRunId: number | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  scoredEntityCount: number | null;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  totalSnapshots: number;
  freshness: "ok" | "stale" | "never-run";
  daysSinceLastRun: number | null;
  featureImportanceJson: { feature: string; importance: number; label: string }[] | null;
  latestRunId: number | null;
}

export interface ScoreDistributionData {
  pipelineName: string;
  runId: number;
  buckets: { bucket: number; count: number }[];
}

export interface BandDistributionData {
  pipelineName: string;
  runId: number;
  bands: { bandLabel: string; count: number }[];
}

export interface FeatureImportanceData {
  runId: number;
  pipelineName: string;
  displayName: string;
  featureImportanceJson: { feature: string; importance: number; label: string }[];
}

// ── Overview Hooks ────────────────────────────────────────────────────────────

export function useGetActionQueue() {
  return useQuery<{ data: ActionQueueData }>({
    queryKey: ["ml", "overview", "action-queue"],
    queryFn: () => apiFetch("/api/superadmin/overview/action-queue"),
    staleTime: 60_000,
  });
}

export function useGetFundingGap() {
  return useQuery<{ data: FundingGapData }>({
    queryKey: ["ml", "overview", "funding-gap"],
    queryFn: () => apiFetch("/api/superadmin/overview/funding-gap"),
    staleTime: 120_000,
  });
}

export function useGetSafehouseHealthMini() {
  return useQuery<{ data: SafehouseHealthMiniItem[] }>({
    queryKey: ["ml", "overview", "safehouse-health-mini"],
    queryFn: () => apiFetch("/api/superadmin/overview/safehouse-health-mini"),
    staleTime: 120_000,
  });
}

// ── Donor Churn Hooks ─────────────────────────────────────────────────────────

export function useGetDonorChurn(params?: {
  page?: number; pageSize?: number; dateRange?: string;
  churnBand?: string; safehouseId?: string; sortBy?: string; sortDir?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: DonorChurnItem[]; meta: DonorChurnMeta }>({
    queryKey: ["ml", "donors", "churn", params],
    queryFn: () => apiFetch(`/api/superadmin/donors/churn${qs}`),
  });
}

export function useGetDonorDonationsRecent(supporterId: number | null) {
  return useQuery<{ data: DonorDonationRecent[] }>({
    queryKey: ["ml", "donors", supporterId, "donations-recent"],
    queryFn: () => apiFetch(`/api/superadmin/donors/${supporterId}/donations-recent`),
    enabled: supporterId != null,
  });
}

export function usePatchDonorAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, string> }) =>
      apiPatch(`/api/superadmin/donors/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ml", "donors"] });
    },
  });
}

// ── Donor Upgrade Hooks ───────────────────────────────────────────────────────

export function useGetDonorUpgrade(params?: {
  page?: number; pageSize?: number; dateRange?: string;
  upgradeBand?: string; safehouseId?: string; sortBy?: string; sortDir?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: DonorUpgradeItem[]; meta: { page: number; pageSize: number; total: number } }>({
    queryKey: ["ml", "donors", "upgrade", params],
    queryFn: () => apiFetch(`/api/superadmin/donors/upgrade${qs}`),
  });
}

// ── Attribution Hooks ─────────────────────────────────────────────────────────

export function useGetAttributionSankey(params?: {
  dateRange?: string; safehouseId?: string; campaignId?: string; donationType?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: { nodes: AttributionSankeyNode[]; links: AttributionSankeyLink[] } }>({
    queryKey: ["ml", "attribution", "sankey", params],
    queryFn: () => apiFetch(`/api/superadmin/attribution/sankey${qs}`),
  });
}

export function useGetAttributionPrograms(params?: {
  dateRange?: string; safehouseId?: string; campaignId?: string; donationType?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: AttributionProgramItem[] }>({
    queryKey: ["ml", "attribution", "programs", params],
    queryFn: () => apiFetch(`/api/superadmin/attribution/programs${qs}`),
  });
}

// ── Campaign Hooks ────────────────────────────────────────────────────────────

export function useGetCampaignEffectiveness(params?: {
  category?: string; status?: string; isBoosted?: string; platform?: string; dateRange?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: CampaignEffectivenessItem[] }>({
    queryKey: ["ml", "campaigns", "effectiveness", params],
    queryFn: () => apiFetch(`/api/superadmin/campaigns/effectiveness${qs}`),
  });
}

export function usePatchCampaignMlFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { recommendedAvoid: boolean } }) =>
      apiPatch(`/api/superadmin/campaigns/${id}/ml-flags`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ml", "campaigns"] });
    },
  });
}

// ── Social Hooks ──────────────────────────────────────────────────────────────

export function useGetSocialHeatmap(params?: { platform?: string; dateRange?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: { cells: SocialHeatmapCell[]; minimumPostsForCell: number } | null; insufficientData?: boolean }>({
    queryKey: ["ml", "social", "heatmap", params],
    queryFn: () => apiFetch(`/api/superadmin/social/heatmap${qs}`),
  });
}

export function useGetSocialRecommendation(params?: { dateRange?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: SocialRecommendation | null }>({
    queryKey: ["ml", "social", "recommendation", params],
    queryFn: () => apiFetch(`/api/superadmin/social/recommendation${qs}`),
  });
}

export function useGetSocialPosts(params?: {
  page?: number; pageSize?: number; platform?: string; mediaType?: string;
  postType?: string; contentTopic?: string; isBoosted?: string;
  conversionBand?: string; dateRange?: string; ids?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: SocialPostItem[]; meta: { page: number; pageSize: number; total: number } }>({
    queryKey: ["ml", "social", "posts", params],
    queryFn: () => apiFetch(`/api/superadmin/social/posts${qs}`),
  });
}

// ── Resident Regression Hooks ─────────────────────────────────────────────────

export function useGetRegressionDistribution(params?: { safehouseId?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: RegressionDistributionItem[]; meta: { totalRestricted: number } }>({
    queryKey: ["ml", "residents", "regression", "distribution", params],
    queryFn: () => apiFetch(`/api/superadmin/residents/regression/distribution${qs}`),
  });
}

export function useGetRegressionWatchlist(params?: {
  page?: number; pageSize?: number; safehouseId?: string;
  regressionRiskBand?: string; minRegressionRiskScore?: string;
  caseStatus?: string; caseCategory?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: RegressionWatchlistItem[]; meta: { page: number; pageSize: number; total: number; totalRestricted: number } }>({
    queryKey: ["ml", "residents", "regression", "watchlist", params],
    queryFn: () => apiFetch(`/api/superadmin/residents/regression/watchlist${qs}`),
  });
}

export function usePatchResidentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, string> }) =>
      apiPatch(`/api/superadmin/residents/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ml", "residents"] });
    },
  });
}

// ── Reintegration Hooks ───────────────────────────────────────────────────────

export function useGetReintegrationFunnel(params?: { safehouseId?: string; dateRange?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: ReintegrationFunnelData }>({
    queryKey: ["ml", "residents", "reintegration", "funnel", params],
    queryFn: () => apiFetch(`/api/superadmin/residents/reintegration/funnel${qs}`),
  });
}

export function useGetReintegrationTable(params?: {
  page?: number; pageSize?: number; safehouseId?: string;
  reintegrationReadinessBand?: string; regressionRiskBand?: string;
  minReadinessScore?: string; reintegrationStatus?: string; caseCategory?: string;
  minLengthOfStay?: string; maxLengthOfStay?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: ReintegrationTableItem[]; meta: { page: number; pageSize: number; total: number; totalRestricted: number } }>({
    queryKey: ["ml", "residents", "reintegration", "table", params],
    queryFn: () => apiFetch(`/api/superadmin/residents/reintegration/table${qs}`),
  });
}

// ── Intervention Hooks ────────────────────────────────────────────────────────

export function useGetInterventionEffectiveness(params?: {
  planCategory?: string; safehouseId?: string; dateRange?: string; effectivenessBand?: string;
}) {
  const qs = buildQs(params);
  return useQuery<{ data: InterventionEffectivenessItem[] }>({
    queryKey: ["ml", "interventions", "effectiveness", params],
    queryFn: () => apiFetch(`/api/superadmin/interventions/effectiveness${qs}`),
  });
}

export function useGetInterventionPlans(category: string | null) {
  return useQuery<{ data: InterventionPlanDetail[] }>({
    queryKey: ["ml", "interventions", "effectiveness", category, "plans"],
    queryFn: () => apiFetch(`/api/superadmin/interventions/effectiveness/${encodeURIComponent(category!)}/plans`),
    enabled: !!category,
  });
}

// ── Safehouse Health Hooks ────────────────────────────────────────────────────

export function useGetSafehouseHealth(params?: { monthStart?: string; status?: string; region?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: SafehouseHealthItem[] }>({
    queryKey: ["ml", "safehouses", "health", params],
    queryFn: () => apiFetch(`/api/superadmin/safehouses/health${qs}`),
  });
}

export function useGetSafehouseHealthHistory(safehouseId: number | null) {
  return useQuery<{ data: SafehouseHealthHistory[] }>({
    queryKey: ["ml", "safehouses", safehouseId, "health-history"],
    queryFn: () => apiFetch(`/api/superadmin/safehouses/${safehouseId}/health-history`),
    enabled: safehouseId != null,
  });
}

export function useGetSafehouseHealthCompare(params?: { safehouseIds?: string; monthStart?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: SafehouseHealthItem[] }>({
    queryKey: ["ml", "safehouses", "health", "compare", params],
    queryFn: () => apiFetch(`/api/superadmin/safehouses/health/compare${qs}`),
    enabled: !!(params?.safehouseIds),
  });
}

// ── ML Model Ops Hooks ────────────────────────────────────────────────────────

export function useGetMlPipelines(params?: { pipelineName?: string; status?: string; freshness?: string }) {
  const qs = buildQs(params);
  return useQuery<{ data: MlPipelineStatus[] }>({
    queryKey: ["ml", "pipelines", params],
    queryFn: () => apiFetch(`/api/superadmin/ml/pipelines${qs}`),
    staleTime: 30_000,
  });
}

export function useGetScoreDistribution(pipelineName: string | null) {
  return useQuery<{ data: ScoreDistributionData | null }>({
    queryKey: ["ml", "score-distribution", pipelineName],
    queryFn: () => apiFetch(`/api/superadmin/ml/score-distribution?pipelineName=${encodeURIComponent(pipelineName!)}`),
    enabled: !!pipelineName,
  });
}

export function useGetBandDistribution(pipelineName: string | null) {
  return useQuery<{ data: BandDistributionData | null }>({
    queryKey: ["ml", "band-distribution", pipelineName],
    queryFn: () => apiFetch(`/api/superadmin/ml/band-distribution?pipelineName=${encodeURIComponent(pipelineName!)}`),
    enabled: !!pipelineName,
  });
}

export function useGetFeatureImportance(runId: number | null) {
  return useQuery<{ data: FeatureImportanceData | null }>({
    queryKey: ["ml", "feature-importance", runId],
    queryFn: () => apiFetch(`/api/superadmin/ml/feature-importance/${runId}`),
    enabled: runId != null,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQs(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export { apiPost };
