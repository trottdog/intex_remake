import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface PublicImpactData {
  residentsServedTotal?: number;
  totalDonationsRaised?: number;
  reintegrationCount?: number;
  safehouseCount?: number;
  programAreasActive?: number;
  milestones?: { title: string; value: string; description: string }[];
  recentSnapshots?: {
    snapshotId?: number;
    id?: number;
    headline?: string;
    title?: string;
    summaryText?: string;
    summary?: string;
    snapshotDate?: string;
    publishedAt?: string | null;
    isPublished?: boolean;
    metricPayloadJson?: Record<string, unknown> | null;
  }[];
}

export function useGetPublicImpact() {
  return useQuery<PublicImpactData>({
    queryKey: ["public", "impact"],
    queryFn: () => apiFetch("/api/dashboard/public-impact"),
  });
}

export function useListPublicSnapshots() {
  return useQuery<{ data: PublicImpactData["recentSnapshots"]; total: number }>({
    queryKey: ["impact-snapshots"],
    queryFn: () => apiFetch("/api/impact-snapshots"),
  });
}
