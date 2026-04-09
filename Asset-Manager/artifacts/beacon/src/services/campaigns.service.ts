import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, apiPatch, apiDelete } from "./api";
import { useAuth } from "@/contexts/AuthContext";

export interface Campaign {
  campaignId: number;
  title: string;
  description: string | null;
  category: string | null;
  goal: number | null;
  deadline: string | null;
  status: string;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  totalRaised: number;
  donorCount: number;
}

export interface DonatePayload {
  campaignId: number;
  amount: number;
  currencyCode?: string;
  channelSource?: string;
  notes?: string;
}

export interface DonateResult {
  donationId: number;
  campaignId: number;
  campaignTitle: string;
  amount: number;
  message: string;
}

// ── QUERIES ──────────────────────────────────────────────────────────────────

export function useListCampaigns() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<{ data: Campaign[]; total: number }>("/api/campaigns", token ?? undefined),
    enabled: !!token,
  });
}

export function useGetCampaign(id: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => apiFetch<Campaign>(`/api/campaigns/${id}`, token ?? undefined),
    enabled: !!token && !!id,
  });
}

// ── MUTATIONS ────────────────────────────────────────────────────────────────

export function useCreateCampaign() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Partial<Campaign>, "campaignId" | "totalRaised" | "donorCount">) =>
      apiPost<Campaign>("/api/campaigns", body, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Campaign> & { id: number }) =>
      apiPatch<Campaign>(`/api/campaigns/${id}`, body, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/campaigns/${id}`, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDonateToCampaign() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, ...payload }: DonatePayload) =>
      apiPost<DonateResult>(`/api/campaigns/${campaignId}/donate`, payload, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["donor", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["donations", "my-ledger"] });
    },
  });
}
