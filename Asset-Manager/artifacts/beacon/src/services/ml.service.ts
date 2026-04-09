import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface MlPipeline {
  runId?: number | null;
  id?: number | null;
  pipelineName?: string | null;
  displayName?: string | null;
  name?: string | null;
  modelName?: string | null;
  status?: string | null;
  trainedAt?: string | null;
  lastRetrained?: string | null;
  dataSource?: string | null;
  metricsJson?: Record<string, unknown> | null;
  manifestJson?: Record<string, unknown> | null;
  predictionCount?: number;
  avgConfidence?: number;
  driftFlags?: number;
  overrideRate?: number;
  healthStatus?: string | null;
  modelVersion?: string | null;
}

export interface MlPrediction {
  predictionId?: number | null;
  id?: number | null;
  runId?: number | null;
  pipelineName?: string | null;
  pipeline?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  entityKey?: string | null;
  entityLabel?: string | null;
  safehouseId?: number | null;
  recordTimestamp?: string | null;
  predictionValue?: number | null;
  predictionScore?: number | null;
  confidenceScore?: number | null;
  rankOrder?: number | null;
  contextJson?: Record<string, unknown> | null;
  createdAt?: string | null;
}

export interface MlInsights {
  totalPredictions: number;
  activePipelines: number;
  avgConfidence: number;
  recentPredictions: MlPrediction[];
  pipelines: MlPipeline[];
}

export function useListMlPipelines() {
  return useQuery<{ data: MlPipeline[] }>({
    queryKey: ["ml", "pipelines"],
    queryFn: () => apiFetch("/api/ml/pipelines"),
  });
}

export function useListMlPredictions(params?: { page?: number; pageSize?: number; entityType?: string }) {
  const s = new URLSearchParams();
  if (params?.page) s.set("page", String(params.page));
  if (params?.pageSize) s.set("pageSize", String(params.pageSize));
  if (params?.entityType) s.set("entityType", params.entityType);
  const qs = s.toString();
  return useQuery<{ data: MlPrediction[]; total: number }>({
    queryKey: ["ml", "predictions", params],
    queryFn: () => apiFetch(`/api/ml/predictions${qs ? `?${qs}` : ""}`),
  });
}

export function useGetMlInsights() {
  return useQuery<MlInsights>({
    queryKey: ["ml", "insights"],
    queryFn: () => apiFetch("/api/ml/insights"),
  });
}
