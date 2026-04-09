import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListResidents, useGetResidentStats, type Resident } from "@/services/residents.service";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Users, Plus, Search, Eye, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RISK_BADGE: Record<string, { pill: string; dot: string }> = {
  Low:      { pill: "bg-green-50  text-green-700  border border-green-200",  dot: "bg-green-500"  },
  Medium:   { pill: "bg-amber-50  text-amber-700  border border-amber-200",  dot: "bg-amber-400"  },
  High:     { pill: "bg-orange-50 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
  Critical: { pill: "bg-red-50    text-red-700    border border-red-200",    dot: "bg-red-600"    },
};

const STATUS_BADGE: Record<string, string> = {
  Active:      "bg-[#e6f4ee] text-[#0e6641] border border-[#b3deca]",
  Closed:      "bg-gray-100  text-gray-500  border border-gray-200",
  Transferred: "bg-purple-50 text-purple-700 border border-purple-200",
};

const REINTEGRATION_BADGE: Record<string, { pill: string; dot: string }> = {
  "Not Started": { pill: "bg-gray-100   text-gray-500   border border-gray-200",   dot: "bg-gray-400"   },
  "In Progress": { pill: "bg-blue-50    text-blue-700   border border-blue-200",   dot: "bg-blue-500"   },
  "On Hold":     { pill: "bg-amber-50   text-amber-700  border border-amber-200",  dot: "bg-amber-400"  },
  Ready:         { pill: "bg-teal-50    text-teal-700   border border-teal-200",   dot: "bg-teal-500"   },
  Completed:     { pill: "bg-[#e6f4ee]  text-[#0e6641]  border border-[#b3deca]", dot: "bg-[#2a9d72]"  },
};

const SUBCATS: { key: keyof Resident; label: string; color: string }[] = [
  { key: "subCatTrafficked", label: "Trafficked", color: "bg-red-50 text-red-700 border border-red-200" },
  { key: "subCatSexualAbuse", label: "Sexual Abuse", color: "bg-rose-50 text-rose-700 border border-rose-200" },
  { key: "subCatPhysicalAbuse", label: "Physical Abuse", color: "bg-orange-50 text-orange-700 border border-orange-200" },
  { key: "subCatOsaec", label: "OSAEC", color: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200" },
  { key: "subCatChildLabor", label: "Child Labor", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  { key: "subCatOrphaned", label: "Orphaned", color: "bg-gray-50 text-gray-700 border border-gray-200" },
  { key: "subCatCicl", label: "CICL", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  { key: "subCatAtRisk", label: "At Risk", color: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  { key: "subCatStreetChild", label: "Street Child", color: "bg-stone-50 text-stone-700 border border-stone-200" },
  { key: "subCatChildWithHiv", label: "Child w/ HIV", color: "bg-purple-50 text-purple-700 border border-purple-200" },
];

export default function ResidentsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const { page, setPage } = useQueryPagination();

  const { data, isLoading } = useListResidents({ page, pageSize: 20 });
  const { data: stats } = useGetResidentStats();

  const rows = (data?.data ?? []).filter((r: Resident) => {
    const q = search.toLowerCase();
    if (q) {
      const searchable = [
        r.caseControlNo, r.internalCode, r.residentCode,
        r.assignedSocialWorker, r.safehouseName, r.caseCategory,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    if (filterStatus && r.caseStatus !== filterStatus) return false;
    if (filterRisk && (r.currentRiskLevel ?? r.riskLevel) !== filterRisk) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
          <p className="text-sm text-gray-500 mt-1">All case files and resident records</p>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Active Cases</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalActive ?? stats.active ?? 0}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">New This Month</div>
            <div className="text-2xl font-bold text-[#2a9d72]">{stats.newAdmissions ?? 0}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">High / Critical Risk</div>
            <div className="text-2xl font-bold text-red-600">{stats.highRiskResidents ?? 0}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Total Records</div>
            <div className="text-2xl font-bold text-gray-700">{data?.total ?? 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by code, worker, or safehouse..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
          <option value="Transferred">Transferred</option>
        </select>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
        >
          <option value="">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Resident</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Sex</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Age</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Risk</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Reintegration</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Safehouse</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Admission</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={10} className="px-4 py-3">
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-14 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No residents found{search ? ` matching "${search}"` : ""}
                </td>
              </tr>
            ) : rows.map((r: Resident) => {
              const resId = r.residentId ?? r.id;
              const risk = r.currentRiskLevel ?? r.riskLevel;
              const activeSubs = SUBCATS.filter(s => r[s.key]);
              return (
                <tr
                  key={resId}
                  onClick={() => navigate(`/admin/residents/${resId}`)}
                  className="hover:bg-[#f0faf5] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-gray-900 text-sm">
                      {r.internalCode ?? "—"}
                    </div>
                    {activeSubs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeSubs.slice(0, 2).map(s => (
                          <span key={s.key as string} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.color}`}>
                            {s.label}
                          </span>
                        ))}
                        {activeSubs.length > 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-50 text-gray-500 border border-gray-200">
                            +{activeSubs.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {r.caseCategory?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {r.sex ? (r.sex.charAt(0).toUpperCase() + r.sex.slice(1)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.presentAge ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {risk ? (() => {
                      const b = RISK_BADGE[risk];
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${b?.pill ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b?.dot ?? "bg-gray-400"}`} />
                          {risk}
                        </span>
                      );
                    })() : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.caseStatus ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[r.caseStatus] ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                        {r.caseStatus}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.reintegrationStatus ? (() => {
                      const b = REINTEGRATION_BADGE[r.reintegrationStatus];
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${b?.pill ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b?.dot ?? "bg-gray-400"}`} />
                          {r.reintegrationStatus}
                        </span>
                      );
                    })() : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.safehouseName ?? (r.safehouseId ? `#${r.safehouseId}` : "—")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.dateOfAdmission ?? r.admissionDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#2a9d72] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/residents/${resId}`); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(data?.total ?? 0) > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {Math.min(page * 20, data?.total ?? 0)} of {data?.total ?? 0} residents</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="self-center text-xs">Page {page} of {Math.ceil((data?.total ?? 1) / 20)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil((data?.total ?? 1) / 20)} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
