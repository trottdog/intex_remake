import { useGetReportDonationTrends, useGetReportAccomplishments, useGetReportReintegrationStats, type ReportAccomplishment, type ReportReintegrationStat } from "@/services/admin.service";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const { data: trends, isLoading: loadingTrends } = useGetReportDonationTrends();
  const { data: accomplishments, isLoading: loadingAccomplishments } = useGetReportAccomplishments();
  const { data: reintegration, isLoading: loadingReintegration } = useGetReportReintegrationStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Program analytics and donor trend reports</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">Donation Trends</h3>
        {loadingTrends ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends?.data ?? []} margin={{ left: -10, right: 10 }}>
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Total"]} />
              <Area type="monotone" dataKey="totalAmount" stroke="#2a9d72" fill="#2a9d72" fillOpacity={0.15} strokeWidth={2} name="Total Amount" />
              <Area type="monotone" dataKey="recurringRevenue" stroke="#457b9d" fill="#457b9d" fillOpacity={0.1} strokeWidth={2} name="Recurring Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">Reintegration Success Rate</h3>
          {loadingReintegration ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div> : (
            <div className="space-y-3">
              {(reintegration?.data ?? []).map((r: ReportReintegrationStat) => (
                <div key={`${r.period}-${r.safehouseId ?? "all"}`} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{r.safehouseName || "All Safehouses"}</div>
                      <div className="text-xs text-gray-500">{r.period}</div>
                    </div>
                    <span className="text-lg font-bold text-[#2a9d72]">{((r.successRate ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2a9d72] rounded-full" style={{ width: `${(r.successRate ?? 0) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>{r.reintegrationCompleted} completed</span>
                    <span>{r.totalResidents} total residents</span>
                    <span>avg {r.avgDaysToReintegration?.toFixed(0)} days</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">Program Accomplishments 2025</h3>
          {loadingAccomplishments ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div> : (
            <div className="space-y-4">
              {(accomplishments?.data ?? []).map((a: ReportAccomplishment) => (
                <div key={a.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm text-gray-900">{a.serviceArea}</div>
                    <span className="text-xs px-2 py-0.5 bg-[#0e2118]/5 text-[#0e2118] rounded-full">{a.category}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 mb-2">
                    <span>{a.beneficiaryCount} beneficiaries</span>
                    <span>{a.sessionsDelivered} sessions</span>
                  </div>
                  <p className="text-xs text-gray-600 italic">{a.outcomeSummary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
