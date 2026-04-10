import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "./api";

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
  supportType?: string | null;
  displayName?: string | null;
  organizationName?: string | null;
  organization?: string | null;
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
  isRecurring?: boolean | null;
  lifetimeGiving?: number | null;
  donationCount?: number | null;
  lastGiftDate?: string | null;
  lastGiftAmount?: number | null;
  hasRecurring?: boolean | null;
  donorSince?: string | null;
}

export interface SupporterGivingStats {
  supporterId: number;
  total: number;
  count: number;
  avgGift: number;
  lastDonationDate?: string | null;
  donationTypesMap: Record<string, number>;
  totalGiven: number;
  donationCount: number;
  avgGiftAmount: number;
  donationsByType: Record<string, number>;
}

export interface SupporterDonationAllocation {
  allocationId: number;
  donationId?: number | null;
  safehouseId?: number | null;
  safehouseName?: string | null;
  programArea?: string | null;
  amountAllocated?: number | null;
  allocationDate?: string | null;
  allocationNotes?: string | null;
}

export interface SupporterInKindDonationItem {
  itemId: number;
  donationId?: number | null;
  itemName?: string | null;
  itemCategory?: string | null;
  quantity?: number | null;
  unitOfMeasure?: string | null;
  estimatedUnitValue?: number | null;
  intendedUse?: string | null;
  receivedCondition?: string | null;
}

export interface SupporterDonationHistoryItem {
  donationId: number;
  supporterId?: number | null;
  donationType?: string | null;
  donationDate?: string | null;
  isRecurring?: boolean | null;
  campaignName?: string | null;
  channelSource?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  estimatedValue?: number | null;
  impactUnit?: string | null;
  notes?: string | null;
  referralPostId?: number | null;
  campaignId?: number | null;
  safehouseId?: number | null;
  safehouseName?: string | null;
  totalAllocated: number;
  unallocated?: number | null;
  isGeneralFund: boolean;
  allocations: SupporterDonationAllocation[];
  inKindItems: SupporterInKindDonationItem[];
}

export interface SupporterProfile {
  supporter: Supporter;
  givingStats: SupporterGivingStats;
  donationHistory: SupporterDonationHistoryItem[];
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

export function useGetSupporterProfile(id: number | string | null) {
  return useQuery<SupporterProfile>({
    queryKey: ["supporters", id, "profile"],
    queryFn: () => apiFetch(`/api/supporters/${id}/profile`),
    enabled: !!id,
  });
}

export function useGetSupporterGivingStats(id: number | string | null) {
  return useQuery<SupporterGivingStats>({
    queryKey: ["supporters", id, "giving-stats"],
    queryFn: () => apiFetch(`/api/supporters/${id}/giving-stats`),
    enabled: !!id,
  });
}

export interface CreateSupporterPayload {
  supporterType?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  email?: string;
  phone?: string;
  status?: string;
  acquisitionChannel?: string;
  recurringEnabled?: boolean;
  region?: string;
  country?: string;
}

export function useCreateSupporter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupporterPayload) => apiPost("/api/supporters", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      qc.invalidateQueries({ queryKey: ["supporters", "stats"] });
    },
  });
}

export function useUpdateSupporter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => apiPatch(`/api/supporters/${id}`, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      qc.invalidateQueries({ queryKey: ["supporters", variables.id] });
      qc.invalidateQueries({ queryKey: ["supporters", "stats"] });
    },
  });
}

export function useDeleteSupporter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/supporters/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supporters"] });
      qc.invalidateQueries({ queryKey: ["supporters", "stats"] });
      qc.invalidateQueries({ queryKey: ["donations"] });
    },
  });
}
