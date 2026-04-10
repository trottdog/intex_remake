import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle, ShieldAlert, CheckCircle, Clock,
  Search, Plus, Pencil, Trash2, X, Eye, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Incident {
  incidentId: number;
  residentId: number | null;
  safehouseId: number | null;
  incidentDate: string | null;
  incidentType: string | null;
  severity: string | null;
  description: string | null;
  responseTaken: string | null;
  resolved: boolean | null;
  resolutionDate: string | null;
  reportedBy: string | null;
  followUpRequired: boolean | null;
  status: string | null;
  residentCode: string | null;
  safehouseName: string | null;
}

interface Resident { residentId: number; internalCode: string | null; }
interface Safehouse { safehouseId: number; safehouseName: string | null; }
interface ApiResponse { data: Incident[]; total: number; pagination: { totalPages: number } }

// ── Config ────────────────────────────────────────────────────────────────────
const INCIDENT_TYPES = [
  "PropertyDamage", "ConflictWithPeer", "SelfHarm",
  "RunawayAttempt", "Medical", "Security", "Behavioral",
];

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  PropertyDamage: "Property Damage",
  ConflictWithPeer: "Conflict with Peer",
  SelfHarm: "Self-Harm",
  RunawayAttempt: "Runaway Attempt",
  Medical: "Medical Emergency",
  Security: "Security Breach",
  Behavioral: "Behavioral Issue",
};
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["open", "investigating", "resolved", "closed"] as const;

const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low:      { label: "Low",      cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  medium:   { label: "Medium",   cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  high:     { label: "High",     cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  critical: { label: "Critical", cls: "bg-red-50 text-red-700 border border-red-200 font-bold" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  open:          { label: "Open",          icon: Clock,       cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  investigating: { label: "Investigating", icon: ShieldAlert, cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  resolved:      { label: "Resolved",      icon: CheckCircle, cls: "bg-[#e6f4ee] text-[#0e6641] border border-[#b3deca]" },
  closed:        { label: "Closed",        icon: CheckCircle, cls: "bg-gray-100 text-gray-600 border border-gray-200" },
};

// ── Form ──────────────────────────────────────────────────────────────────────
type FormState = {
  residentId: number | null;
  safehouseId: number | null;
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  responseTaken: string;
  reportedBy: string;
  followUpRequired: boolean;
  status: string;
  resolved: boolean;
  resolutionDate: string;
};

const EMPTY: FormState = {
  residentId: null, safehouseId: null, incidentDate: "", incidentType: "",
  severity: "medium", description: "", responseTaken: "", reportedBy: "",
  followUpRequired: false, status: "open", resolved: false, resolutionDate: "",
};

function toPayload(f: FormState) {
  return {
    residentId: f.residentId ?? undefined,
    safehouseId: f.safehouseId ?? undefined,
    incidentDate: f.incidentDate || null,
    incidentType: f.incidentType || null,
    severity: f.severity || null,
    description: f.description || null,
    responseTaken: f.responseTaken || null,
    reportedBy: f.reportedBy || null,
    followUpRequired: f.followUpRequired,
    status: f.status || null,
    resolved: f.resolved,
    resolutionDate: f.resolutionDate || null,
  };
}

// ── Detail Field ──────────────────────────────────────────────────────────────
function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-snug whitespace-pre-line">{value ?? <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IncidentsPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [safehouseFilter, setSafehouseFilter] = useState<number | null>(null);
  const { page, setPage } = useQueryPagination();
  const [viewTarget, setViewTarget] = useState<Incident | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);
  const [formError, setFormError] = useState("");

  function buildQs(extra?: Record<string, string>) {
    const p: Record<string, string> = { ...extra };
    if (safehouseFilter) p.safehouseId = String(safehouseFilter);
    return new URLSearchParams(p).toString();
  }

  const { data, isLoading } = useQuery({
    queryKey: ["incident-reports", page, safehouseFilter],
    queryFn: () => apiFetch<ApiResponse>(`/api/incident-reports?${buildQs({ page: String(page), limit: "20" })}`, token ?? undefined),
    enabled: !!token,
  });

  // Separate stats query: fetch all records (high limit) to compute accurate KPI counts
  const { data: statsData } = useQuery({
    queryKey: ["incident-reports-stats", safehouseFilter],
    queryFn: () => apiFetch<ApiResponse>(`/api/incident-reports?${buildQs({ page: "1", limit: "2000" })}`, token ?? undefined),
    enabled: !!token,
  });

  const { data: residentsData } = useQuery({
    queryKey: ["residents-list-for-inc"],
    queryFn: () => apiFetch<{ data: Resident[] }>("/api/residents?limit=200", token ?? undefined),
    enabled: !!token,
  });

  const { data: safehousesData } = useQuery({
    queryKey: ["safehouses-list-for-inc"],
    queryFn: () => apiFetch<{ data: Safehouse[] }>("/api/safehouses?limit=100", token ?? undefined),
    enabled: !!token,
  });

  const residents: Resident[] = residentsData?.data ?? [];
  const safehouses: Safehouse[] = safehousesData?.data ?? [];

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
    queryClient.invalidateQueries({ queryKey: ["incident-reports-stats"] });
  }

  const createMutation = useMutation({
    mutationFn: (body: object) => apiPost<Incident>("/api/incident-reports", body, token ?? undefined),
    onSuccess: () => { invalidateAll(); closePanel(); },
    onError: () => setFormError("Failed to save. Please check all fields."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiPatch<Incident>(`/api/incident-reports/${id}`, body, token ?? undefined),
    onSuccess: () => { invalidateAll(); closePanel(); },
    onError: () => setFormError("Failed to update. Please check all fields."),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/incident-reports/${id}`, token ?? undefined),
    onSuccess: () => { invalidateAll(); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(""); setPanelOpen(true); }
  function openEdit(r: Incident) {
    setEditing(r);
    setForm({
      residentId: r.residentId, safehouseId: r.safehouseId,
      incidentDate: r.incidentDate ?? "", incidentType: r.incidentType ?? "",
      severity: r.severity ?? "medium", description: r.description ?? "",
      responseTaken: r.responseTaken ?? "", reportedBy: r.reportedBy ?? "",
      followUpRequired: r.followUpRequired ?? false, status: r.status ?? "open",
      resolved: r.resolved ?? false, resolutionDate: r.resolutionDate ?? "",
    });
    setFormError(""); setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); setEditing(null); setFormError(""); }
  function set<K extends keyof FormState>(key: K, val: FormState[K]) { setForm(p => ({ ...p, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.incidentDate) { setFormError("Incident date is required."); return; }
    if (!form.incidentType) { setFormError("Incident type is required."); return; }
    const payload = toPayload(form);
    if (editing) updateMutation.mutate({ id: editing.incidentId, body: payload });
    else createMutation.mutate(payload);
  }

  const allIncidents = data?.data ?? [];
  const allStats = statsData?.data ?? [];
  const incidents = allIncidents.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.incidentType?.toLowerCase().includes(q) ||
      r.residentCode?.toLowerCase().includes(q) ||
      r.safehouseName?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.reportedBy?.toLowerCase().includes(q)
    );
  });

  const totalAll = statsData?.total ?? data?.total ?? 0;
  const resolvedCount = allStats.filter(i => i.status === "resolved" || i.status === "closed" || (i.resolved === true && !i.status)).length;
  const open = allStats.filter(i => i.status === "open" || i.status === "investigating" || (!i.status && !i.resolved)).length;
  const critical = allStats.filter(i => i.severity === "critical").length;

  const totalPages = data?.pagination?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage safehouse incidents</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Safehouse filter */}
          <div className="relative">
            <select
              value={safehouseFilter ?? ""}
              onChange={e => {
                setSafehouseFilter(e.target.value ? parseInt(e.target.value) : null);
                setPage(1);
              }}
              className="appearance-none text-sm border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2a9d72]"
            >
              <option value="">All Safehouses</option>
              {safehouses.map(sh => (
                <option key={sh.safehouseId} value={sh.safehouseId}>{sh.safehouseName ?? `Safehouse #${sh.safehouseId}`}</option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▾</span>
          </div>
          <Button onClick={openCreate} className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-2">
            <Plus className="w-4 h-4" /> New Incident
          </Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Incidents", value: totalAll, color: "text-gray-900" },
          { label: "Open / Investigating", value: open, color: "text-amber-600" },
          { label: "Critical Severity", value: critical, color: "text-red-600" },
          { label: "Resolved / Closed", value: resolvedCount, color: "text-[#2a9d72]" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{isLoading ? "—" : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search type, resident, safehouse..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {safehouseFilter && (
          <div className="flex items-center gap-1.5 text-xs text-[#2a9d72] bg-[#f0faf5] border border-[#b3e8cf] px-3 py-1.5 rounded-lg">
            <span className="font-medium">{safehouses.find(s => s.safehouseId === safehouseFilter)?.safehouseName ?? "Selected safehouse"}</span>
            <button onClick={() => { setSafehouseFilter(null); setPage(1); }} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Safehouse</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-up</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No incidents found</p>
                  {!search && <p className="text-xs mt-1">Use "New Incident" to log the first record</p>}
                </td>
              </tr>
            ) : incidents.map(r => {
              const sev = SEVERITY_CONFIG[r.severity ?? ""] ?? { label: r.severity ?? "—", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
              const effectiveStatus = r.status ?? (r.resolved ? "resolved" : "open");
              const st = STATUS_CONFIG[effectiveStatus] ?? { label: effectiveStatus, icon: Clock, cls: "bg-gray-100 text-gray-600 border border-gray-200" };
              const StatusIcon = st.icon;
              return (
                <tr key={r.incidentId} onClick={() => setViewTarget(r)} className="hover:bg-[#f0faf5] transition-colors group cursor-pointer">
                  <td className="px-5 py-3.5 text-gray-700 text-xs whitespace-nowrap">
                    {r.incidentDate ? new Date(r.incidentDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium text-gray-900 text-xs">{INCIDENT_TYPE_LABELS[r.incidentType ?? ""] ?? r.incidentType ?? "—"}</span>
                    </div>
                    {r.description && <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{r.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.residentCode ? (
                      <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{r.residentCode}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{r.safehouseName ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sev.cls}`}>{sev.label}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.cls}`}>
                      <StatusIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.followUpRequired
                      ? <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Required</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{data?.total ?? 0} total incidents</span>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail View Panel ── */}
      {viewTarget && !panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setViewTarget(null)} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0e2118]">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-[#7bc5a6]" />
                <div>
                  <h2 className="text-base font-bold text-white">Incident Report</h2>
                  {viewTarget.residentCode ? (
                    <button onClick={() => viewTarget.residentId && navigate(`/admin/residents/${viewTarget.residentId}`)}
                      className="text-xs text-[#7bc5a6] hover:text-white flex items-center gap-1 transition-colors mt-0.5">
                      <span className="font-mono font-semibold">{viewTarget.residentCode}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <p className="text-xs text-[#7bc5a6] mt-0.5">{viewTarget.safehouseName ?? "No safehouse linked"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setViewTarget(null); openEdit(viewTarget); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setViewTarget(null); setDeleteTarget(viewTarget); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button onClick={() => setViewTarget(null)} className="ml-1 text-gray-300 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Severity + Status banner */}
              <div className="flex gap-3">
                {(() => {
                  const sev = SEVERITY_CONFIG[viewTarget.severity ?? ""] ?? { label: viewTarget.severity ?? "—", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
                  const st = STATUS_CONFIG[viewTarget.status ?? ""] ?? { label: viewTarget.status ?? "—", icon: Clock, cls: "bg-gray-100 text-gray-600 border border-gray-200" };
                  const StatusIcon = st.icon;
                  return (
                    <>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${sev.cls}`}>{sev.label} Severity</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                        <StatusIcon className="w-3.5 h-3.5" /> {st.label}
                      </span>
                      {viewTarget.followUpRequired && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Follow-up Required</span>
                      )}
                    </>
                  );
                })()}
              </div>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Incident Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Incident Date" value={viewTarget.incidentDate ? new Date(viewTarget.incidentDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetailField label="Incident Type" value={INCIDENT_TYPE_LABELS[viewTarget.incidentType ?? ""] ?? viewTarget.incidentType} />
                  <DetailField label="Reported By" value={viewTarget.reportedBy} />
                  <DetailField label="Safehouse" value={viewTarget.safehouseName} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{viewTarget.description ?? <span className="text-gray-300 italic">—</span>}</p>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Response Taken</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{viewTarget.responseTaken ?? <span className="text-gray-300 italic">—</span>}</p>
              </section>

              {(viewTarget.resolved || viewTarget.resolutionDate) && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Resolution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Resolved" value={viewTarget.resolved ? "Yes" : "No"} />
                    <DetailField label="Resolution Date" value={viewTarget.resolutionDate ? new Date(viewTarget.resolutionDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Panel ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0e2118]">
              <div>
                <h2 className="text-base font-bold text-white">{editing ? "Edit Incident Report" : "New Incident Report"}</h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">Log a safehouse incident for official record</p>
              </div>
              <button onClick={closePanel} className="text-gray-300 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Incident Info */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Incident Information</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Incident Date <span className="text-red-500">*</span></label>
                      <input type="date" value={form.incidentDate} onChange={e => set("incidentDate", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Reported By</label>
                      <input type="text" value={form.reportedBy} onChange={e => set("reportedBy", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Name or designation" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Incident Type <span className="text-red-500">*</span></label>
                    <select value={form.incidentType} onChange={e => set("incidentType", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" required>
                      <option value="">— Select Type —</option>
                      {INCIDENT_TYPES.map(t => <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t] ?? t}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Severity</label>
                      <select value={form.severity} onChange={e => set("severity", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                      <select value={form.status} onChange={e => set("status", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Resident & Safehouse */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Linked Records</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Resident Involved</label>
                    <select value={form.residentId ?? ""} onChange={e => set("residentId", e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                      <option value="">— None / Unknown —</option>
                      {residents.map(r => <option key={r.residentId} value={r.residentId}>{r.internalCode ?? `#${r.residentId}`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Safehouse</label>
                    <select value={form.safehouseId ?? ""} onChange={e => set("safehouseId", e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                      <option value="">— Not specified —</option>
                      {safehouses.map(s => <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseName ?? `#${s.safehouseId}`}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Details */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Details & Response</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                    <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="What happened? Describe the incident..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Response Taken</label>
                    <textarea rows={2} value={form.responseTaken} onChange={e => set("responseTaken", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="What immediate actions were taken..." />
                  </div>
                </div>
              </section>

              {/* Flags */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Flags & Resolution</h3>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.followUpRequired ? "border-[#2a9d72] bg-[#f0faf5]" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
                    <input type="checkbox" checked={form.followUpRequired} onChange={e => set("followUpRequired", e.target.checked)} className="mt-0.5 accent-[#2a9d72]" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Follow-up Required</p>
                      <p className="text-xs text-gray-500">This incident needs a scheduled follow-up action</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.resolved ? "border-[#2a9d72] bg-[#f0faf5]" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
                    <input type="checkbox" checked={form.resolved} onChange={e => set("resolved", e.target.checked)} className="mt-0.5 accent-[#2a9d72]" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Marked as Resolved</p>
                      <p className="text-xs text-gray-500">The incident has been fully addressed</p>
                    </div>
                  </label>
                </div>
                {form.resolved && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Resolution Date</label>
                    <input type="date" value={form.resolutionDate} onChange={e => set("resolutionDate", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                  </div>
                )}
              </section>

              {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button type="button" variant="outline" onClick={closePanel}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#2a9d72] hover:bg-[#238c63] text-white">
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Log Incident"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Incident Report</h3>
                <p className="text-xs text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete the <span className="font-semibold">{deleteTarget.incidentType ?? "incident"}</span> report
              {deleteTarget.incidentDate && <> from {new Date(deleteTarget.incidentDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</>}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => deleteMutation.mutate(deleteTarget.incidentId)} disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
