import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useListResidents, useCreateResident, type Resident } from "@/services/residents.service";
import { useListSafehouses } from "@/services/superadmin.service";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Users, Plus, Search, Eye, AlertTriangle, X, Loader2 } from "lucide-react";
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

const CASE_CATEGORIES = [
  "Surrendered", "Abandoned", "Neglected", "Abused",
  "Exploited", "Trafficked", "CICL", "At Risk", "Other",
];

function AddResidentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: safehousesData, isLoading: loadingSafehouses } = useListSafehouses({ pageSize: 100 });
  const createResident = useCreateResident();
  const safehouses = safehousesData?.data ?? [];

  const [form, setForm] = useState({
    caseCategory: "",
    sex: "",
    dateOfBirth: "",
    dateOfAdmission: new Date().toISOString().slice(0, 10),
    safehouseId: "" as string | number,
    caseStatus: "Active",
    initialRiskLevel: "Low",
    referralSource: "",
    assignedSocialWorker: "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (createResident.isPending) return;
    setError(null);
    if (!form.safehouseId) { setError("Please assign a safehouse."); return; }

    const body: Record<string, unknown> = {
      caseCategory: form.caseCategory || null,
      sex: form.sex || null,
      dateOfBirth: form.dateOfBirth || null,
      dateOfAdmission: form.dateOfAdmission || null,
      safehouseId: Number(form.safehouseId),
      caseStatus: form.caseStatus,
      initialRiskLevel: form.initialRiskLevel,
      currentRiskLevel: form.initialRiskLevel,
      referralSource: form.referralSource || null,
      assignedSocialWorker: form.assignedSocialWorker || null,
    };

    createResident.mutate(body, {
      onSuccess: () => { onCreated(); onClose(); },
      onError: (err) => setError((err as { message?: string })?.message ?? "Failed to create resident."),
    });
  }

  const fieldCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#0e2118] px-6 pt-5 pb-4 shrink-0">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4 text-[#2a9d72]" />
            <span className="text-[#2a9d72] text-xs font-semibold uppercase tracking-wide">New Resident</span>
          </div>
          <h2 className="text-lg font-bold text-white">Add Resident</h2>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="rounded-xl border border-[#cfe7dc] bg-[#f5fbf8] px-4 py-3 text-sm text-[#245844]">
            Internal code is generated automatically after the resident is created.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Safehouse <span className="text-red-400">*</span></label>
              {loadingSafehouses ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : (
                <select className={fieldCls} value={form.safehouseId} onChange={e => set("safehouseId", e.target.value)}>
                  <option value="">Select safehouse...</option>
                  {safehouses.map(s => (
                    <option key={s.safehouseId ?? s.id} value={s.safehouseId ?? s.id ?? ""}>{s.name ?? `Safehouse #${s.safehouseId ?? s.id}`}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Case Category</label>
              <select className={fieldCls} value={form.caseCategory} onChange={e => set("caseCategory", e.target.value)}>
                <option value="">Select...</option>
                {CASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sex</label>
              <select className={fieldCls} value={form.sex} onChange={e => set("sex", e.target.value)}>
                <option value="">Select...</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Case Status</label>
              <select className={fieldCls} value={form.caseStatus} onChange={e => set("caseStatus", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" className={fieldCls} value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Date of Admission</label>
              <input type="date" className={fieldCls} value={form.dateOfAdmission} onChange={e => set("dateOfAdmission", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Initial Risk Level</label>
              <select className={fieldCls} value={form.initialRiskLevel} onChange={e => set("initialRiskLevel", e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Referral Source</label>
              <input className={fieldCls} value={form.referralSource} onChange={e => set("referralSource", e.target.value)} placeholder="e.g. DSWD, NGO..." />
            </div>
            <div>
              <label className={labelCls}>Assigned Social Worker</label>
              <input className={fieldCls} value={form.assignedSocialWorker} onChange={e => set("assignedSocialWorker", e.target.value)} placeholder="Worker name" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createResident.isPending}
            className="flex-1 py-2.5 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {createResident.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Plus className="w-4 h-4" /> Add Resident</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ResidentsPage() {
  const [location, navigate] = useLocation();
  const isSuperAdmin = location.startsWith("/superadmin");
  const basePath = isSuperAdmin ? "/superadmin/residents" : "/admin/residents";
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterSafehouse, setFilterSafehouse] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { page, pageSize, setPage } = useQueryPagination();
  const { data: safehousesData } = useListSafehouses({ pageSize: 100 });
  const safehouses = safehousesData?.data ?? [];

  useEffect(() => {
    setPage(1);
  }, [filterSafehouse, filterStatus, filterRisk, search, setPage]);

  const { data: allResidentsData, isLoading } = useListResidents({
    page: 1,
    pageSize: 2000,
    safehouseId: filterSafehouse ?? undefined,
    caseStatus: filterStatus || undefined,
  });
  const allResidents = allResidentsData?.data ?? [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filteredResidents = allResidents.filter((r: Resident) => {
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
  const totalFilteredResidents = filteredResidents.length;
  const totalPages = totalFilteredResidents === 0 ? 1 : Math.ceil(totalFilteredResidents / pageSize);
  const safePage = Math.min(page, totalPages);
  const rows = filteredResidents.slice((safePage - 1) * pageSize, safePage * pageSize);
  const derivedStats = {
    totalActive: filteredResidents.filter((resident) => resident.caseStatus === "Active").length,
    newAdmissions: filteredResidents.filter((resident) => {
      const rawDate = resident.dateOfAdmission ?? resident.admissionDate;
      if (!rawDate) return false;
      const parsed = new Date(rawDate);
      return !Number.isNaN(parsed.getTime()) && parsed >= thirtyDaysAgo;
    }).length,
    highRiskResidents: filteredResidents.filter((resident) => {
      const risk = resident.currentRiskLevel ?? resident.riskLevel;
      return risk === "High" || risk === "Critical";
    }).length,
    total: totalFilteredResidents,
  };

  return (
    <div className="space-y-6">
      {showAdd && <AddResidentModal onClose={() => setShowAdd(false)} onCreated={() => setPage(1)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
          <p className="text-sm text-gray-500 mt-1">All case files and resident records</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#2a9d72] hover:bg-[#23856a] text-white gap-1.5">
          <Plus className="w-4 h-4" /> Add Resident
        </Button>
      </div>

      {/* Stats Bar */}
      {(
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Active Cases</div>
            <div className="text-2xl font-bold text-gray-900">{derivedStats.totalActive}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">New This Month</div>
            <div className="text-2xl font-bold text-[#2a9d72]">{derivedStats.newAdmissions}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">High / Critical Risk</div>
            <div className="text-2xl font-bold text-red-600">{derivedStats.highRiskResidents}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Total Records</div>
            <div className="text-2xl font-bold text-gray-700">{derivedStats.total}</div>
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
        <select
          value={filterSafehouse ?? ""}
          onChange={(e) => setFilterSafehouse(e.target.value ? Number(e.target.value) : null)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[180px]"
        >
          <option value="">All Safehouses</option>
          {safehouses.map((safehouse) => (
            <option key={safehouse.safehouseId ?? safehouse.id} value={safehouse.safehouseId ?? safehouse.id ?? ""}>
              {safehouse.name ?? `Safehouse #${safehouse.safehouseId ?? safehouse.id}`}
            </option>
          ))}
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
              const displayCode = r.internalCode ?? r.residentCode ?? r.caseControlNo ?? (resId ? `CASE-${resId}` : "—");
              const activeSubs = SUBCATS.filter(s => r[s.key]);
              return (
                <tr
                  key={resId}
                  onClick={() => navigate(`${basePath}/${resId}`)}
                  className="hover:bg-[#f0faf5] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-gray-900 text-sm">
                      {displayCode}
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
                      onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/${resId}`); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalFilteredResidents > pageSize && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {rows.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1}-{Math.min(safePage * pageSize, totalFilteredResidents)} of {totalFilteredResidents} residents</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</Button>
              <span className="self-center text-xs">Page {safePage} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
