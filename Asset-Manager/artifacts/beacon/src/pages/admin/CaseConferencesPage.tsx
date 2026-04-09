import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Pencil, Trash2, X, ExternalLink, Eye } from "lucide-react";

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-snug whitespace-pre-line">{value ?? <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}

interface CaseConference {
  conferenceId: number;
  residentId: number | null;
  conferenceDate: string | null;
  conferenceType: string | null;
  summary: string | null;
  decisionsMade: string | null;
  nextSteps: string | null;
  nextConferenceDate: string | null;
  createdBy: string | null;
  residentCode: string | null;
}

interface Resident { residentId: number; internalCode: string | null; }
interface ApiResponse { data: CaseConference[]; total: number; pagination: { totalPages: number } }

const CONFERENCE_TYPES = ["Initial Assessment", "Case Review", "Intervention Planning", "Reintegration Planning", "Crisis Response", "Closure Conference", "Other"];

type FormState = {
  residentId: number | null;
  conferenceDate: string;
  conferenceType: string;
  summary: string;
  decisionsMade: string;
  nextSteps: string;
  nextConferenceDate: string;
  createdBy: string;
};

const EMPTY: FormState = {
  residentId: null, conferenceDate: "", conferenceType: "", summary: "",
  decisionsMade: "", nextSteps: "", nextConferenceDate: "", createdBy: "",
};

function toPayload(f: FormState) {
  return {
    residentId: f.residentId ?? undefined,
    conferenceDate: f.conferenceDate || null,
    conferenceType: f.conferenceType || null,
    summary: f.summary || null,
    decisionsMade: f.decisionsMade || null,
    nextSteps: f.nextSteps || null,
    nextConferenceDate: f.nextConferenceDate || null,
    createdBy: f.createdBy || null,
  };
}

export default function CaseConferencesPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { page, setPage } = useQueryPagination();
  const [viewTarget, setViewTarget] = useState<CaseConference | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<CaseConference | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<CaseConference | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["case-conferences", page],
    queryFn: () => apiFetch<ApiResponse>(`/api/case-conferences?page=${page}&limit=20`, token ?? undefined),
    enabled: !!token,
  });

  const { data: residentsData } = useQuery({
    queryKey: ["residents-list-for-cc"],
    queryFn: () => apiFetch<{ data: Resident[] }>("/api/residents?limit=200", token ?? undefined),
    enabled: !!token,
  });

  const residents: Resident[] = residentsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: object) => apiPost<CaseConference>("/api/case-conferences", body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["case-conferences"] }); closePanel(); },
    onError: () => setFormError("Failed to save. Please check all fields."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => apiPatch<CaseConference>(`/api/case-conferences/${id}`, body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["case-conferences"] }); closePanel(); },
    onError: () => setFormError("Failed to update. Please check all fields."),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/case-conferences/${id}`, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["case-conferences"] }); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(""); setPanelOpen(true); }
  function openEdit(r: CaseConference) {
    setEditing(r);
    setForm({
      residentId: r.residentId, conferenceDate: r.conferenceDate ?? "",
      conferenceType: r.conferenceType ?? "", summary: r.summary ?? "",
      decisionsMade: r.decisionsMade ?? "", nextSteps: r.nextSteps ?? "",
      nextConferenceDate: r.nextConferenceDate ?? "", createdBy: r.createdBy ?? "",
    });
    setFormError(""); setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); setEditing(null); setFormError(""); }
  function set<K extends keyof FormState>(key: K, val: FormState[K]) { setForm(p => ({ ...p, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setFormError("Please select a resident."); return; }
    if (!form.conferenceDate) { setFormError("Conference date is required."); return; }
    const payload = toPayload(form);
    if (editing) updateMutation.mutate({ id: editing.conferenceId, body: payload });
    else createMutation.mutate(payload);
  }

  const conferences = (data?.data ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.residentCode?.toLowerCase().includes(q) || r.conferenceType?.toLowerCase().includes(q) || r.createdBy?.toLowerCase().includes(q);
  });

  const totalPages = data?.pagination?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Conferences</h1>
          <p className="text-sm text-gray-500 mt-1">Multidisciplinary case conference minutes and decisions</p>
        </div>
        <Button onClick={openCreate} className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-2">
          <Plus className="w-4 h-4" /> New Conference
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search resident, type, or facilitator..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Conference Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Facilitated By</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Conference</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : conferences.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No case conferences found</p>
                  {!search && <p className="text-xs mt-1">Use "New Conference" to add the first record</p>}
                </td>
              </tr>
            ) : conferences.map(r => (
              <tr key={r.conferenceId} onClick={() => setViewTarget(r)} className="hover:bg-[#f0faf5] transition-colors group cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#0e2118] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(r.residentCode?.[0] ?? "R").toUpperCase()}
                    </div>
                    <span className="font-mono font-semibold text-gray-900 text-xs">{r.residentCode || `#${r.residentId}`}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-700 text-xs whitespace-nowrap">
                  {r.conferenceDate ? new Date(r.conferenceDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </td>
                <td className="px-5 py-3.5">
                  {r.conferenceType ? (
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-xs font-medium">{r.conferenceType}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-600 text-xs">{r.createdBy ?? "—"}</td>
                <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                  {r.nextConferenceDate ? new Date(r.nextConferenceDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[160px] truncate">{r.summary ?? "—"}</td>
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
            <span>{data?.total ?? 0} total conferences</span>
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
                  <h2 className="text-base font-bold text-white">Case Conference</h2>
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Conference Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Conference Date" value={viewTarget.conferenceDate ? new Date(viewTarget.conferenceDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetailField label="Conference Type" value={viewTarget.conferenceType} />
                  <DetailField label="Facilitated By" value={viewTarget.createdBy} />
                  <DetailField label="Next Conference Date" value={viewTarget.nextConferenceDate ? new Date(viewTarget.nextConferenceDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Summary</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{viewTarget.summary ?? <span className="text-gray-300 italic">—</span>}</p>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Decisions & Next Steps</h3>
                <div className="space-y-4">
                  <DetailField label="Decisions Made" value={viewTarget.decisionsMade} />
                  <DetailField label="Next Steps" value={viewTarget.nextSteps} />
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
                <h2 className="text-base font-bold text-white">{editing ? "Edit Case Conference" : "New Case Conference"}</h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">Multidisciplinary conference record</p>
              </div>
              <button onClick={closePanel} className="text-gray-300 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Conference Information</h3>
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
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Conference Date <span className="text-red-500">*</span></label>
                      <input type="date" value={form.conferenceDate} onChange={e => set("conferenceDate", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Conference Type</label>
                      <select value={form.conferenceType} onChange={e => set("conferenceType", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {CONFERENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Facilitated By</label>
                      <input type="text" value={form.createdBy} onChange={e => set("createdBy", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Name or designation" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Next Conference Date</label>
                      <input type="date" value={form.nextConferenceDate} onChange={e => set("nextConferenceDate", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</h3>
                <textarea rows={3} value={form.summary} onChange={e => set("summary", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                  placeholder="Brief summary of what was discussed..." />
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Decisions & Next Steps</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Decisions Made</label>
                    <textarea rows={3} value={form.decisionsMade} onChange={e => set("decisionsMade", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="Formal decisions agreed upon by the team..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Next Steps</label>
                    <textarea rows={2} value={form.nextSteps} onChange={e => set("nextSteps", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="Action items and assigned responsibilities..." />
                  </div>
                </div>
              </section>

              {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button type="button" variant="outline" onClick={closePanel}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#2a9d72] hover:bg-[#238c63] text-white">
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Conference Record"}
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
                <h3 className="font-bold text-gray-900">Delete Case Conference</h3>
                <p className="text-xs text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete the case conference record for{" "}
              <span className="font-mono font-bold">{deleteTarget.residentCode || `#${deleteTarget.residentId}`}</span>
              {deleteTarget.conferenceDate && <> on {new Date(deleteTarget.conferenceDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</>}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => deleteMutation.mutate(deleteTarget.conferenceId)} disabled={deleteMutation.isPending}
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
