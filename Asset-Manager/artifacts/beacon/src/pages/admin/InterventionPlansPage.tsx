import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, Plus, Pencil, Trash2, X, ExternalLink, Eye } from "lucide-react";

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-snug whitespace-pre-line">{value ?? <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}

interface InterventionPlan {
  planId: number;
  residentId: number | null;
  planCategory: string | null;
  planDescription: string | null;
  servicesProvided: string | null;
  targetValue: number | null;
  targetDate: string | null;
  status: string | null;
  caseConferenceDate: string | null;
  residentCode: string | null;
}

interface Resident { residentId: number; internalCode: string | null; }
interface ApiResponse { data: InterventionPlan[]; total: number; pagination: { totalPages: number } }

const PLAN_CATEGORIES = [
  "Psychosocial Support", "Legal Assistance", "Medical / Health", "Educational Support",
  "Livelihood / Skills Training", "Family Reintegration", "Shelter Transition", "Spiritual / Pastoral", "Other",
];

const PLAN_STATUSES = ["Planned", "In Progress", "On Hold", "Completed", "Discontinued"];

const STATUS_COLORS: Record<string, string> = {
  Planned:       "bg-gray-100   text-gray-600   border border-gray-200",
  "In Progress": "bg-blue-50    text-blue-700   border border-blue-200",
  "On Hold":     "bg-amber-50   text-amber-700  border border-amber-200",
  Completed:     "bg-[#e6f4ee]  text-[#0e6641]  border border-[#b3deca]",
  Discontinued:  "bg-red-50     text-red-700    border border-red-200",
};

type FormState = {
  residentId: number | null;
  planCategory: string;
  planDescription: string;
  servicesProvided: string;
  targetValue: string;
  targetDate: string;
  status: string;
  caseConferenceDate: string;
};

const EMPTY: FormState = {
  residentId: null, planCategory: "", planDescription: "", servicesProvided: "",
  targetValue: "", targetDate: "", status: "", caseConferenceDate: "",
};

function toPayload(f: FormState) {
  return {
    residentId: f.residentId ?? undefined,
    planCategory: f.planCategory || null,
    planDescription: f.planDescription || null,
    servicesProvided: f.servicesProvided || null,
    targetValue: f.targetValue ? f.targetValue : null,
    targetDate: f.targetDate || null,
    status: f.status || null,
    caseConferenceDate: f.caseConferenceDate || null,
  };
}

export default function InterventionPlansPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { page, setPage } = useQueryPagination();
  const [viewTarget, setViewTarget] = useState<InterventionPlan | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<InterventionPlan | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<InterventionPlan | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["intervention-plans", page],
    queryFn: () => apiFetch<ApiResponse>(`/api/intervention-plans?page=${page}&limit=20`, token ?? undefined),
    enabled: !!token,
  });

  const { data: residentsData } = useQuery({
    queryKey: ["residents-list-for-ip"],
    queryFn: () => apiFetch<{ data: Resident[] }>("/api/residents?limit=200", token ?? undefined),
    enabled: !!token,
  });

  const residents: Resident[] = residentsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: object) => apiPost<InterventionPlan>("/api/intervention-plans", body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["intervention-plans"] }); closePanel(); },
    onError: () => setFormError("Failed to save. Please check all fields."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => apiPatch<InterventionPlan>(`/api/intervention-plans/${id}`, body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["intervention-plans"] }); closePanel(); },
    onError: () => setFormError("Failed to update. Please check all fields."),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/intervention-plans/${id}`, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["intervention-plans"] }); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(""); setPanelOpen(true); }
  function openEdit(r: InterventionPlan) {
    setEditing(r);
    setForm({
      residentId: r.residentId, planCategory: r.planCategory ?? "", planDescription: r.planDescription ?? "",
      servicesProvided: r.servicesProvided ?? "", targetValue: r.targetValue != null ? String(r.targetValue) : "",
      targetDate: r.targetDate ?? "", status: r.status ?? "", caseConferenceDate: r.caseConferenceDate ?? "",
    });
    setFormError(""); setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); setEditing(null); setFormError(""); }
  function set<K extends keyof FormState>(key: K, val: FormState[K]) { setForm(p => ({ ...p, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setFormError("Please select a resident."); return; }
    const payload = toPayload(form);
    if (editing) updateMutation.mutate({ id: editing.planId, body: payload });
    else createMutation.mutate(payload);
  }

  const plans = (data?.data ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.residentCode?.toLowerCase().includes(q) || r.planCategory?.toLowerCase().includes(q) || r.status?.toLowerCase().includes(q);
  });

  const totalPages = data?.pagination?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intervention Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Service plans and progress tracking for each resident</p>
        </div>
        <Button onClick={openCreate} className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-2">
          <Plus className="w-4 h-4" /> New Intervention Plan
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search resident, category, or status..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Services Provided</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No intervention plans found</p>
                  {!search && <p className="text-xs mt-1">Use "New Intervention Plan" to add the first record</p>}
                </td>
              </tr>
            ) : plans.map(r => (
              <tr key={r.planId} onClick={() => setViewTarget(r)} className="hover:bg-[#f0faf5] transition-colors group cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#0e2118] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(r.residentCode?.[0] ?? "R").toUpperCase()}
                    </div>
                    <span className="font-mono font-semibold text-gray-900 text-xs">{r.residentCode || `#${r.residentId}`}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {r.planCategory ? (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium">{r.planCategory}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  {r.status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                      {r.status}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                  {r.targetDate ? new Date(r.targetDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[140px] truncate">{r.servicesProvided ?? "—"}</td>
                <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[160px] truncate">{r.planDescription ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{data?.total ?? 0} total plans</span>
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
                  <h2 className="text-base font-bold text-white">Intervention Plan</h2>
                  <button onClick={() => viewTarget.residentId && navigate(`/admin/residents/${viewTarget.residentId}`)}
                    className="text-xs text-[#7bc5a6] hover:text-white flex items-center gap-1 transition-colors mt-0.5">
                    <span className="font-mono font-semibold">{viewTarget.residentCode || `#${viewTarget.residentId}`}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
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
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Plan Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Category" value={viewTarget.planCategory} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Status</p>
                    {viewTarget.status ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[viewTarget.status] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>{viewTarget.status}</span>
                    ) : <span className="text-gray-300 italic text-sm">—</span>}
                  </div>
                  <DetailField label="Target Date" value={viewTarget.targetDate ? new Date(viewTarget.targetDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetailField label="Target Value" value={viewTarget.targetValue != null ? String(viewTarget.targetValue) : null} />
                  <DetailField label="Linked Conference Date" value={viewTarget.caseConferenceDate ? new Date(viewTarget.caseConferenceDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Plan Details</h3>
                <div className="space-y-4">
                  <DetailField label="Plan Description" value={viewTarget.planDescription} />
                  <DetailField label="Services Provided" value={viewTarget.servicesProvided} />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over Panel ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#0e2118]">
              <div>
                <h2 className="text-base font-bold text-white">{editing ? "Edit Intervention Plan" : "New Intervention Plan"}</h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">Service plan and goal tracking record</p>
              </div>
              <button onClick={closePanel} className="text-gray-300 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Plan Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Resident <span className="text-red-500">*</span></label>
                    <select value={form.residentId ?? ""} onChange={e => set("residentId", e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" required>
                      <option value="">— Select Resident —</option>
                      {residents.map(r => <option key={r.residentId} value={r.residentId}>{r.internalCode ?? `#${r.residentId}`}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Category</label>
                      <select value={form.planCategory} onChange={e => set("planCategory", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {PLAN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                      <select value={form.status} onChange={e => set("status", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {PLAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Target Date</label>
                      <input type="date" value={form.targetDate} onChange={e => set("targetDate", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Target Value</label>
                      <input type="number" step="0.01" value={form.targetValue} onChange={e => set("targetValue", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Numeric goal (optional)" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Plan Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Description</label>
                    <textarea rows={3} value={form.planDescription} onChange={e => set("planDescription", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="Describe the goals and approach of this plan..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Services Provided</label>
                    <textarea rows={2} value={form.servicesProvided} onChange={e => set("servicesProvided", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="List of services being delivered..." />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Tracking</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Linked Case Conference Date</label>
                  <input type="date" value={form.caseConferenceDate} onChange={e => set("caseConferenceDate", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                </div>
              </section>

              {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button type="button" variant="outline" onClick={closePanel}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#2a9d72] hover:bg-[#238c63] text-white">
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Plan"}
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
                <h3 className="font-bold text-gray-900">Delete Intervention Plan</h3>
                <p className="text-xs text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete the <span className="font-semibold">{deleteTarget.planCategory ?? "intervention"}</span> plan for{" "}
              <span className="font-mono font-bold">{deleteTarget.residentCode || `#${deleteTarget.residentId}`}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => deleteMutation.mutate(deleteTarget.planId)} disabled={deleteMutation.isPending}
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
