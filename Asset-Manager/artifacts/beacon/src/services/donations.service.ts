import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPost, apiPatch } from "./api";

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

export interface DonationTrend {
  month: string;
  period?: string;
  total?: number;
  totalAmount?: number;
  count?: number;
  donationCount?: number;
  avgAmount?: number;
}

export function useListDonations(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: Donation[]; total: number }>({
    queryKey: ["donations", params],
    queryFn: () => apiFetch(`/api/donations${qs ? `?${qs}` : ""}`),
  });
}

export function useGetDonationTrends(months?: number) {
  const s = new URLSearchParams();
  if (months) s.set("months", String(months));
  const qs = s.toString();
  return useQuery<{ data: DonationTrend[] }>({
    queryKey: ["donations", "trends", months],
    queryFn: () => apiFetch(`/api/donations/trends${qs ? `?${qs}` : ""}`),
  });
}

export function useGetDonation(id: number | string | null) {
  return useQuery<Donation>({
    queryKey: ["donations", id],
    queryFn: () => apiFetch(`/api/donations/${id}`),
    enabled: !!id,
  });
}

export function useGetMyDonationLedger(params?: { page?: number; pageSize?: number }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  const qs = s.toString();
  return useQuery<{ data: Donation[]; total: number }>({
    queryKey: ["donations", "my-ledger", params],
    queryFn: () => apiFetch(`/api/donations/my-ledger${qs ? `?${qs}` : ""}`),
  });
}

export interface GiveDonationPayload {
  amount: number;
  currencyCode?: string;
  channelSource?: string;
  notes?: string;
  isRecurring?: boolean;
  safehouseId?: number | null;
}

export function useGiveDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GiveDonationPayload) => apiPost("/api/donations/give", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donations", "my-ledger"] });
      qc.invalidateQueries({ queryKey: ["donor", "dashboard"] });
    },
  });
}

export interface CreateDonationPayload {
  supporterId?: number | null;
  donationType?: string;
  donationDate?: string;
  isRecurring?: boolean;
  channelSource?: string;
  currencyCode?: string;
  amount?: number;
  estimatedValue?: number;
  impactUnit?: string;
  notes?: string;
  safehouseId?: number | null;
}

export function useCreateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDonationPayload) => apiPost("/api/donations", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["admin-directed-donations"] });
      qc.invalidateQueries({ queryKey: ["admin-safehouse-donations"] });
      qc.invalidateQueries({ queryKey: ["supporters"] });
    },
  });
}

export function useUpdateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => apiPatch(`/api/donations/${id}`, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["donations", variables.id] });
      qc.invalidateQueries({ queryKey: ["admin-directed-donations"] });
      qc.invalidateQueries({ queryKey: ["admin-safehouse-donations"] });
      qc.invalidateQueries({ queryKey: ["supporters"] });
    },
  });
}

export function useDeleteDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/donations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["admin-directed-donations"] });
      qc.invalidateQueries({ queryKey: ["admin-safehouse-donations"] });
      qc.invalidateQueries({ queryKey: ["supporters"] });
    },
  });
}

export interface PublicInKindDonationItemPayload {
  itemName: string;
  itemCategory?: string;
  quantity: number;
  unitOfMeasure?: string;
  estimatedUnitValue?: number;
  intendedUse?: string;
  receivedCondition?: string;
}

export interface PublicInKindDonationPayload {
  name: string;
  email: string;
  notes?: string;
  safehouseId?: number | null;
  supporterId?: number | null;
  items: PublicInKindDonationItemPayload[];
}

export function createPublicInKindDonation(payload: PublicInKindDonationPayload) {
  return apiPost("/api/donations/public/in-kind", payload);
}

export function useGetRecurringStatus() {
  return useQuery<{ recurringEnabled: boolean }>({
    queryKey: ["recurring-status"],
    queryFn: () => apiFetch("/api/supporters/me/recurring"),
  });
}

export function useToggleRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => apiPatch("/api/supporters/me/recurring", { recurringEnabled: enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-status"] });
    },
  });
}
