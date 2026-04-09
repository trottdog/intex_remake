import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface SupporterStatsSupportTypeMixItem {
  type: string;
  count: number;
  percentage?: number;
}

export interface SupporterAcquisitionChannelItem {
  channel: string;
  count: number;
}

export interface Supporter {
  supporterId?: number | null;
  id?: number | null;
  supporterType?: string | null;
  displayName?: string | null;
  organizationName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  relationshipType?: string | null;
  region?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  createdAt?: string | null;
  firstDonationDate?: string | null;
  acquisitionChannel?: string | null;
  identityUserId?: string | null;
  canLogin?: boolean | null;
  recurringEnabled?: boolean | null;
  lifetimeGiving?: number | null;
  donationCount?: number | null;
  lastGiftDate?: string | null;
  hasRecurring?: boolean | null;
}

export interface SupporterStats {
  total?: number;
  totalSupporters?: number;
  activeSupporters?: number;
  recurringDonors?: number;
  avgGiftSize?: number;
  raisedThisMonth?: number;
  lifetimeTotal?: number;
  newSupporters?: number;
  acquisitionByChannel?: SupporterAcquisitionChannelItem[];
  supportTypeMix?: SupporterStatsSupportTypeMixItem[];
}

export function useListSupporters(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: Supporter[]; total: number }>({
    queryKey: ["supporters", params],
    queryFn: () => apiFetch(`/api/supporters${qs ? `?${qs}` : ""}`),
  });
}

export function useGetSupporterStats() {
  return useQuery<SupporterStats>({
    queryKey: ["supporters", "stats"],
    queryFn: () => apiFetch("/api/supporters/stats"),
  });
}

export function useGetSupporter(id: number | string | null) {
  return useQuery<Supporter>({
    queryKey: ["supporters", id],
    queryFn: () => apiFetch(`/api/supporters/${id}`),
    enabled: !!id,
  });
}

export function useGetSupporterGivingStats(id: number | string | null) {
  return useQuery<Record<string, unknown>>({
    queryKey: ["supporters", id, "giving-stats"],
    queryFn: () => apiFetch(`/api/supporters/${id}/giving-stats`),
    enabled: !!id,
  });
}
