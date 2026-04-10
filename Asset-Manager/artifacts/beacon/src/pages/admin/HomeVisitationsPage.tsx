import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Search, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, X, ExternalLink, Eye } from "lucide-react";

function DetailField({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (typeof value === "boolean") {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800">{value ? "Yes" : "No"}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-snug">{value ?? <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}

interface HomeVisitation {
  visitationId: number;
  residentId: number | null;
  visitDate: string | null;
  socialWorker: string | null;
  visitType: string | null;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  purpose: string | null;
  observations: string | null;
  familyCooperationLevel: string | null;
  safetyConcernsNoted: boolean | null;
  followUpNeeded: boolean | null;
  followUpNotes: string | null;
  visitOutcome: string | null;
  residentCode: string | null;
}

interface Resident { residentId: number; internalCode: string | null; }
interface ApiResponse { data: HomeVisitation[]; total: number; pagination: { totalPages: number } }

const VISIT_TYPES = ["Initial Assessment", "Routine Follow-Up", "Reintegration Assessment", "Post-Placement Monitoring", "Emergency"] as const;
const COOPERATION_LEVELS = ["Highly Cooperative", "Cooperative", "Neutral", "Uncooperative"] as const;
const VISIT_OUTCOMES = ["Favorable", "Needs Improvement", "Unfavorable", "Inconclusive"] as const;

type FormState = {
  residentId: number | null;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
  visitOutcome: string;
};

const EMPTY: FormState = {
  residentId: null, visitDate: "", socialWorker: "", visitType: "",
  locationVisited: "", familyMembersPresent: "", purpose: "", observations: "",
  familyCooperationLevel: "", safetyConcernsNoted: false, followUpNeeded: false,
  followUpNotes: "", visitOutcome: "",
};

function toPayload(f: FormState) {
  return {
    residentId: f.residentId ?? undefined,
    visitDate: f.visitDate || null,
    socialWorker: f.socialWorker || null,
    visitType: f.visitType || null,
    locationVisited: f.locationVisited || null,
    familyMembersPresent: f.familyMembersPresent || null,
    purpose: f.purpose || null,
    observations: f.observations || null,
    familyCooperationLevel: f.familyCooperationLevel || null,
    safetyConcernsNoted: f.safetyConcernsNoted,
    followUpNeeded: f.followUpNeeded,
    followUpNotes: f.followUpNotes || null,
    visitOutcome: f.visitOutcome || null,
  };
}

export default function HomeVisitationsPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { page, setPage } = useQueryPagination();
  const [viewTarget, setViewTarget] = useState<HomeVisitation | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<HomeVisitation | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<HomeVisitation | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["home-visitations", page],
    queryFn: () => apiFetch<ApiResponse>(`/api/home-visitations?page=${page}&limit=20`, token ?? undefined),
    enabled: !!token,
  });

  const { data: residentsData } = useQuery({
    queryKey: ["residents-list-for-hv"],
    queryFn: () => apiFetch<{ data: Resident[] }>("/api/residents?limit=200", token ?? undefined),
    enabled: !!token,
  });

  const residents: Resident[] = residentsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: object) => apiPost<HomeVisitation>("/api/home-visitations", body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["home-visitations"] }); closePanel(); },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Failed to save home visit."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => apiPatch<HomeVisitation>(`/api/home-visitations/${id}`, body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["home-visitations"] }); closePanel(); },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Failed to update home visit."),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/home-visitations/${id}`, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["home-visitations"] }); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(""); setPanelOpen(true); }
  function openEdit(r: HomeVisitation) {
    setEditing(r);
    setForm({
      residentId: r.residentId, visitDate: r.visitDate ?? "", socialWorker: r.socialWorker ?? "",
      visitType: r.visitType ?? "", locationVisited: r.locationVisited ?? "",
      familyMembersPresent: r.familyMembersPresent ?? "", purpose: r.purpose ?? "",
      observations: r.observations ?? "", familyCooperationLevel: r.familyCooperationLevel ?? "",
      safetyConcernsNoted: r.safetyConcernsNoted ?? false, followUpNeeded: r.followUpNeeded ?? false,
      followUpNotes: r.followUpNotes ?? "", visitOutcome: r.visitOutcome ?? "",
    });
    setFormError(""); setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); setEditing(null); setFormError(""); }
  function set<K extends keyof FormState>(key: K, val: FormState[K]) { setForm(p => ({ ...p, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setFormError("Please select a resident."); return; }
    if (!form.visitDate) { setFormError("Visit date is required."); return; }
    const payload = toPayload(form);
    if (editing) updateMutation.mutate({ id: editing.visitationId, body: payload });
    else createMutation.mutate(payload);
  }

  const visits = (data?.data ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.residentCode?.toLowerCase().includes(q) || r.socialWorker?.toLowerCase().includes(q) || r.visitType?.toLowerCase().includes(q);
  });

  const totalPages = data?.pagination?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Home Visits</h1>
          <p className="text-sm text-gray-500 mt-1">Field visit records and family assessment notes</p>
        </div>
        <Button onClick={openCreate} className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-2">
          <Plus className="w-4 h-4" /> New Home Visit
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search resident, worker, or type..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visit Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Social Worker</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : visits.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <Home className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No home visits found</p>
                  {!search && <p className="text-xs mt-1">Use "New Home Visit" to add the first record</p>}
                </td>
              </tr>
            ) : visits.map(r => (
              <tr key={r.visitationId} onClick={() => setViewTarget(r)} className="hover:bg-[#f0faf5] transition-colors group cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#0e2118] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(r.residentCode?.[0] ?? "R").toUpperCase()}
                    </div>
                    <span className="font-mono font-semibold text-gray-900 text-xs">{r.residentCode || `#${r.residentId}`}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-700 text-xs whitespace-nowrap">
                  {r.visitDate ? new Date(r.visitDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </td>
                <td className="px-5 py-3.5 text-gray-600 text-xs">{r.socialWorker ?? "—"}</td>
                <td className="px-5 py-3.5">
                  {r.visitType ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">{r.visitType}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[140px] truncate">{r.locationVisited ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1.5 flex-wrap">
                    {r.safetyConcernsNoted && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Safety
                      </span>
                    )}
                    {r.followUpNeeded && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <CheckCircle2 className="w-3 h-3" /> Follow-up
                      </span>
                    )}
                    {!r.safetyConcernsNoted && !r.followUpNeeded && <span className="text-gray-300 text-xs">—</span>}
                  </div>
                </td>
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
            <span>{data?.total ?? 0} total visits</span>
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
                  <h2 className="text-base font-bold text-white">Home Visit Record</h2>
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Visit Date" value={viewTarget.visitDate ? new Date(viewTarget.visitDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetailField label="Visit Type" value={viewTarget.visitType} />
                  <DetailField label="Social Worker" value={viewTarget.socialWorker} />
                  <DetailField label="Location Visited" value={viewTarget.locationVisited} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Details</h3>
                <div className="space-y-4">
                  <DetailField label="Family Members Present" value={viewTarget.familyMembersPresent} />
                  <DetailField label="Purpose of Visit" value={viewTarget.purpose} />
                  <DetailField label="Observations" value={viewTarget.observations} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Outcome & Assessment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Family Cooperation Level" value={viewTarget.familyCooperationLevel} />
                  <DetailField label="Visit Outcome" value={viewTarget.visitOutcome} />
                  <DetailField label="Safety Concerns Noted" value={viewTarget.safetyConcernsNoted ? "Yes" : "No"} />
                  <DetailField label="Follow-up Needed" value={viewTarget.followUpNeeded ? "Yes" : "No"} />
                </div>
              </section>
              {viewTarget.followUpNotes && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Follow-up Notes</h3>
                  <p className="text-sm text-gray-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">{viewTarget.followUpNotes}</p>
                </section>
              )}
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
                <h2 className="text-base font-bold text-white">{editing ? "Edit Home Visit" : "New Home Visit"}</h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">Field visit and family assessment record</p>
              </div>
              <button onClick={closePanel} className="text-gray-300 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Information</h3>
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
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Date <span className="text-red-500">*</span></label>
                      <input type="date" value={form.visitDate} onChange={e => set("visitDate", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Type</label>
                      <select value={form.visitType} onChange={e => set("visitType", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Social Worker</label>
                      <input type="text" value={form.socialWorker} onChange={e => set("socialWorker", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Location Visited</label>
                      <input type="text" value={form.locationVisited} onChange={e => set("locationVisited", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Address or description" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Family Members Present</label>
                    <input type="text" value={form.familyMembersPresent} onChange={e => set("familyMembersPresent", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="e.g. Mother, Aunt" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purpose of Visit</label>
                    <input type="text" value={form.purpose} onChange={e => set("purpose", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Main objective of this visit" />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Observations & Outcome</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Observations</label>
                    <textarea rows={3} value={form.observations} onChange={e => set("observations", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="What was observed during the visit..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Family Cooperation</label>
                      <select value={form.familyCooperationLevel} onChange={e => set("familyCooperationLevel", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {COOPERATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Visit Outcome</label>
                      <select value={form.visitOutcome} onChange={e => set("visitOutcome", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {VISIT_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Flags</h3>
                <div className="space-y-2">
                  {([
                    { key: "safetyConcernsNoted" as const, label: "Safety Concerns Noted", sub: "Immediate safety issues observed during visit" },
                    { key: "followUpNeeded" as const, label: "Follow-up Needed", sub: "This visit requires a scheduled follow-up" },
                  ] as const).map(({ key, label, sub }) => (
                    <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form[key] ? "border-[#2a9d72] bg-[#f0faf5]" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
                      <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} className="mt-0.5 accent-[#2a9d72]" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {form.followUpNeeded && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Follow-up Notes</h3>
                  <textarea rows={2} value={form.followUpNotes} onChange={e => set("followUpNotes", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                    placeholder="What follow-up actions are needed..." />
                </section>
              )}

              {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button type="button" variant="outline" onClick={closePanel}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#2a9d72] hover:bg-[#238c63] text-white">
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Visit Record"}
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
                <h3 className="font-bold text-gray-900">Delete Home Visit</h3>
                <p className="text-xs text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete the home visit record for{" "}
              <span className="font-mono font-bold">{deleteTarget.residentCode || `#${deleteTarget.residentId}`}</span>
              {deleteTarget.visitDate && <> on {new Date(deleteTarget.visitDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</>}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => deleteMutation.mutate(deleteTarget.visitationId)} disabled={deleteMutation.isPending}
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
