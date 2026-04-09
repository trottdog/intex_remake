import { useListMlPipelines, useListMlPredictions, type MlPipeline, type MlPrediction } from "@/services/ml.service";
import { Activity, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";

const HEALTH_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  healthy: { label: "Healthy", class: "bg-green-100 text-green-700", icon: CheckCircle },
  degraded: { label: "Degraded", class: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  action_required: { label: "Action Required", class: "bg-red-100 text-red-700", icon: AlertTriangle },
  training: { label: "Training", class: "bg-blue-100 text-blue-700", icon: Clock },
};

export default function MLDashboard() {
  const { data: pipelines, isLoading: loadingPipelines } = useListMlPipelines();
  const { data: predictions, isLoading: loadingPredictions } = useListMlPredictions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ML Pipeline Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor and manage the 8 AI/ML prediction pipelines</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loadingPipelines ? (
          <div className="col-span-2 py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (pipelines?.data ?? []).map((p: MlPipeline) => {
          const health = HEALTH_CONFIG[p.healthStatus ?? ""] ?? HEALTH_CONFIG.healthy;
          const HealthIcon = health.icon;
          return (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.description}</div>
                </div>
                <span className={`ml-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 ${health.class}`}>
                  <HealthIcon className="w-3 h-3" />
                  {health.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Predictions</div>
                  <div className="text-lg font-bold text-gray-900">{p.predictionCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Confidence</div>
                  <div className="text-lg font-bold text-[#2a9d72]">{((p.avgConfidence ?? 0) * 100).toFixed(0)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Drift Flags</div>
                  <div className={`text-lg font-bold ${(p.driftFlags ?? 0) > 0 ? "text-amber-600" : "text-gray-400"}`}>{p.driftFlags ?? 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Override Rate</div>
                  <div className="text-lg font-bold text-gray-700">{((p.overrideRate ?? 0) * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>v{p.modelVersion}</span>
                <span>Retrained {p.lastRetrained}</span>
                <span className="capitalize">{p.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">Latest AI Predictions</h3>
        {loadingPredictions ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-3">
            {(predictions?.data ?? []).slice(0, 6).map((pred: MlPrediction) => {
              const isHighRisk = ["high_risk", "critical"].includes(pred.riskBand ?? "");
              return (
                <div key={pred.id} className={`flex items-start gap-4 p-3 rounded-lg border ${isHighRisk ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                  <Activity className={`w-4 h-4 mt-0.5 shrink-0 ${isHighRisk ? "text-red-600" : "text-[#2a9d72]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{pred.pipeline}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isHighRisk ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {pred.riskBand?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{pred.recommendedAction}</div>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      <span>Entity: {pred.entityType} #{pred.entityId}</span>
                      <span>Score: {((pred.predictionValue ?? 0) * 100).toFixed(0)}%</span>
                      <span>Confidence: {((pred.confidenceScore ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
