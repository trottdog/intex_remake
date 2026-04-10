import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiPatch } from "./api";

export interface GivingTrendPoint {
  month: string;
  year: number;
  amount: number;
}

export interface AllocationBreakdown {
  programArea: string;
  amount: number;
  percentage: number;
}

export interface DonorRecentDonation {
  donationId?: number | null;
  donationType?: string | null;
  donationDate?: string | null;
  campaignName?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  channelSource?: string | null;
}

export interface MlReintegrationItem {
  predictionId?: number | null;
  entityLabel?: string | null;
  predictionScore?: number | null;
  contextJson?: Record<string, unknown> | null;
}

export interface DonorImpactStats {
  activeResidents?: number;
  totalResidentsServed?: number;
  safehouses?: number;
  reintegrations?: number;
  avgHealthScore?: number | null;
  avgEducationProgress?: number | null;
}

export interface DonorRecentSnapshot {
  snapshotId?: number | null;
  snapshotDate?: string | null;
  headline?: string | null;
  summaryText?: string | null;
  metricPayloadJson?: Record<string, unknown> | null;
  publishedAt?: string | null;
}

export interface DonorDashboardSummary {
  lifetimeGiving?: number;
  givingThisYear?: number;
  donationCount?: number;
  lastDonationDate?: string | null;
  lastDonationAmount?: number | null;
  campaignsSupported?: number;
  givingTrend?: GivingTrendPoint[];
  allocationBreakdown?: AllocationBreakdown[];
  recentDonations?: DonorRecentDonation[];
  impactStats?: DonorImpactStats;
  recentSnapshots?: DonorRecentSnapshot[];
  mlReintegrationReadiness?: MlReintegrationItem[];
  // Legacy fields
  totalGiven?: number;
  isRecurring?: boolean;
  impactCards?: { title?: string; value?: string; description?: string }[];
  allocationBreakdownLegacy?: { category: string; amount: number; percentage: number; programArea?: string }[];
}

export interface PublicImpactSnapshot {
  snapshotId?: number | null;
  id?: number | null;
  snapshotDate?: string | null;
  headline?: string | null;
  summaryText?: string | null;
  metricPayloadJson?: Record<string, unknown> | null;
  isPublished?: boolean | null;
  publishedAt?: string | null;
  title?: string | null;
  summary?: string | null;
}

export interface Donation {
  donationId?: number | null;
  id?: number | null;
  supporterId?: number | null;
  donationType?: string | null;
  donationDate?: string | null;
  isRecurring?: boolean | null;
  campaignName?: string | null;
  campaign?: string | null;
  channelSource?: string | null;
  currencyCode?: string | null;
  currency?: string | null;
  amount?: number | null;
  estimatedValue?: number | null;
  impactUnit?: string | null;
  notes?: string | null;
  referralPostId?: number | null;
  supporterName?: string | null;
}

export interface SocialMediaPost {
  postId?: number | null;
  id?: number | null;
  platform?: string | null;
  postUrl?: string | null;
  imageUrl?: string | null;
  mediaType?: string | null;
  content?: string | null;
  caption?: string | null;
  createdAt?: string | null;
  postDate?: string | null;
  postType?: string | null;
  likes?: number | null;
  shares?: number | null;
  comments?: number | null;
  reach?: number | null;
  engagementRate?: number | null;
  donationReferrals?: number | null;
  estimatedDonationValuePhp?: number | null;
}

export interface DonorProfileUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organizationName?: string;
  organization?: string;
  communicationPreference?: string;
}

export function useGetDonorDashboardSummary() {
  return useQuery<DonorDashboardSummary>({
    queryKey: ["donor", "dashboard"],
    queryFn: () => apiFetch("/api/dashboard/donor-summary"),
  });
}

export function useGetMyDonorProfile() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["donor", "profile"],
    queryFn: () => apiFetch("/api/supporters/me"),
  });
}

export function useListMyDonations(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: Donation[]; total: number }>({
    queryKey: ["donations", "my-ledger", params],
    queryFn: () => apiFetch(`/api/donations/my-ledger${qs ? `?${qs}` : ""}`),
  });
}

export function useListImpactSnapshots(params?: { pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: PublicImpactSnapshot[]; total: number }>({
    queryKey: ["impact-snapshots", params],
    queryFn: () => apiFetch(`/api/impact-snapshots${qs ? `?${qs}` : ""}`),
  });
}

export function useListSocialMediaPosts(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: SocialMediaPost[]; total: number }>({
    queryKey: ["social-media-posts", params],
    queryFn: () => apiFetch(`/api/social-media-posts${qs ? `?${qs}` : ""}`),
  });
}

export async function updateDonorProfile(data: DonorProfileUpdate) {
  return apiPatch("/api/supporters/me", data);
}

export { updateDonorProfile as updateMyDonorProfile };
