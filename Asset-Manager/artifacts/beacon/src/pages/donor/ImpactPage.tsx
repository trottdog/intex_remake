import { useGetDonorDashboardSummary, useListImpactSnapshots } from "@/services/donor.service";
import { useGetPublicImpact } from "@/services/public.service";
import {
  Heart, Users, Home, TrendingUp, Award, BookOpen, Activity,
  Calendar, Loader2, ChevronRight,
} from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
} from "recharts";

function fmt(n: number | null | undefined, prefix = "₱") {
  if (!n) return `${prefix}0`;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${n.toLocaleString()}`;
  return `${prefix}${n.toFixed(0)}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

function RadialMetric({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const data = [{ value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="60%" outerRadius="90%"
            startAngle={90} endAngle={-270}
            data={data}
          >
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f0f0f0" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-gray-800">{pct}%</span>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center mt-1 max-w-[80px]">{label}</div>
    </div>
  );
}

export default function ImpactPage() {
  const { data: publicImpact, isLoading: loadingPublic } = useGetPublicImpact();
  const { data: donorSummary, isLoading: loadingDonor } = useGetDonorDashboardSummary();
  const { data: snapshotsRes, isLoading: loadingSnaps } = useListImpactSnapshots({ pageSize: 10 });

  const snapshots = snapshotsRes?.data ?? [];
  const isLoading = loadingPublic || loadingDonor || loadingSnaps;

  const residentsTotal = publicImpact?.residentsServedTotal ?? 0;
  const safehouses = publicImpact?.safehouseCount ?? 0;
  const reintegrations = publicImpact?.reintegrationCount ?? 0;
  const donationsRaised = donorSummary?.lifetimeGiving ?? donorSummary?.totalGiven ?? 0;

  return (
    <div className="space-y-8">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Impact</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Real data from across our safehouse network — every number represents a life touched by your generosity.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 animate-spin text-[#2a9d72]" />
        </div>
      ) : (
        <>
          {/* ── HERO IMPACT BANNER ─────────────────────────────────── */}
          <div className="relative bg-gradient-to-br from-[#f0faf5] via-[#e8f5ee] to-[#f0faf5] border border-[#c8e6d4] rounded-2xl p-8 overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#2a9d72] opacity-10 rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-[#2a9d72]" />
                <span className="text-[#2a9d72] text-xs font-bold uppercase tracking-widest">Mission Impact — Live Data</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { icon: Users, label: "Residents Served", value: `${residentsTotal}+`, sub: "Since founding" },
                  { icon: Home, label: "Active Safehouses", value: String(safehouses), sub: "Philippines regions" },
                  { icon: Award, label: "Reintegrations", value: String(reintegrations), sub: "Community restored" },
                  { icon: TrendingUp, label: "Funds Raised", value: fmt(donationsRaised), sub: "Total contributions" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#2a9d72]/10 flex items-center justify-center mx-auto mb-2">
                      <item.icon className="w-5 h-5 text-[#2a9d72]" />
                    </div>
                    <div className="text-3xl font-black text-[#0e2118]">{item.value}</div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">{item.label}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── OUTCOME CARDS ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Heart, label: "Psychosocial Support", desc: "Trauma counseling sessions delivered to every resident", color: "#e76f51", iconBg: "#e76f5118" },
              { icon: BookOpen, label: "Education", desc: "ALS enrollment and schooling for residents in our care", color: "#457b9d", iconBg: "#457b9d18" },
              { icon: Activity, label: "Health & Wellbeing", desc: "Regular health monitoring and medical care", color: "#2a9d72", iconBg: "#2a9d7218" },
              { icon: Award, label: "Reintegration", desc: "Structured reintegration planning and family reunification", color: "#e9c46a", iconBg: "#e9c46a18" },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: card.iconBg }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div className="font-bold text-gray-800 text-sm mb-1">{card.label}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </div>

          {/* ── IMPACT REPORTS ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Impact Reports</h2>
                <p className="text-xs text-gray-400 mt-0.5">Published quarterly — verified operational data</p>
              </div>
              {snapshots.length > 0 && (
                <span className="text-xs bg-[#2a9d72]/10 text-[#2a9d72] font-semibold px-3 py-1 rounded-full">
                  {snapshots.length} report{snapshots.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {snapshots.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 text-sm">
                Impact reports will appear here once published by our team.
              </div>
            ) : (
              <div className="space-y-4">
                {snapshots.map((snap) => {
                  const metrics = snap.metricPayloadJson ?? {};
                  const kpis = [
                    { label: "Residents Served", value: metrics.residentsServed, icon: Users },
                    { label: "Reintegrations", value: metrics.reintegrations, icon: Award },
                    { label: "Funds Raised", value: metrics.donationsRaised ? fmt(Number(metrics.donationsRaised)) : null, icon: TrendingUp },
                    { label: "Programs Active", value: metrics.programsActive, icon: BookOpen },
                  ].filter(k => k.value != null);

                  return (
                    <div
                      key={snap.snapshotId ?? snap.id}
                      className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-300" />
                            <span className="text-xs text-gray-400">{fmtDate(snap.snapshotDate)}</span>
                            {snap.isPublished && (
                              <span className="text-xs text-[#2a9d72] font-semibold bg-[#2a9d72]/10 px-2 py-0.5 rounded-full">
                                Published
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 leading-snug">{snap.headline ?? snap.title ?? "Impact Report"}</h3>
                          {(snap.summaryText ?? snap.summary) && (
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                              {snap.summaryText ?? snap.summary}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                      </div>

                      {kpis.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-50">
                          {kpis.map((k) => (
                            <div key={k.label} className="text-center p-3 bg-[#f8faf9] rounded-xl">
                              <k.icon className="w-4 h-4 text-[#2a9d72] mx-auto mb-1" />
                              <div className="text-xl font-black text-[#0e2118]">{String(k.value)}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
