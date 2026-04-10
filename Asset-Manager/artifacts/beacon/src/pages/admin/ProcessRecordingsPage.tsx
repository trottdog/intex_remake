import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Search, Plus, Pencil, Trash2, AlertTriangle,
  CheckCircle2, ChevronRight, X, Clock, User, ExternalLink, Eye
} from "lucide-react";

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-snug">{value ?? <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}
function FlagChip({ active, color, label }: { active: boolean; color: string; label: string }) {
  if (!active) return null;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>;
}

interface ProcessRecording {
  recordingId: number;
  residentId: number | null;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
  notesRestricted: string | null;
  residentCode: string | null;
}

interface Resident {
  residentId: number;
  internalCode: string | null;
}

interface ApiResponse { data: ProcessRecording[]; total: number; pagination: { totalPages: number } }

const SESSION_TYPES = ["Individual", "Group"] as const;
const EMOTIONAL_STATES = ["Calm", "Anxious", "Sad", "Angry", "Hopeful", "Withdrawn", "Happy", "Distressed"] as const;

type FormState = {
  residentId: number | null;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  notesRestricted: string;
};

const EMPTY_FORM: FormState = {
  residentId: null,
  sessionDate: "",
  socialWorker: "",
  sessionType: "",
  sessionDurationMinutes: null,
  emotionalStateObserved: "",
  emotionalStateEnd: "",
  sessionNarrative: "",
  interventionsApplied: "",
  followUpActions: "",
  progressNoted: false,
  concernsFlagged: false,
  referralMade: false,
  notesRestricted: "",
};

function toPayload(form: typeof EMPTY_FORM) {
  return {
    ...form,
    residentId: form.residentId ?? undefined,
    sessionDate: form.sessionDate || null,
    socialWorker: form.socialWorker || null,
    sessionType: form.sessionType || null,
    sessionDurationMinutes: form.sessionDurationMinutes || null,
    emotionalStateObserved: form.emotionalStateObserved || null,
    emotionalStateEnd: form.emotionalStateEnd || null,
    sessionNarrative: form.sessionNarrative || null,
    interventionsApplied: form.interventionsApplied || null,
    followUpActions: form.followUpActions || null,
    notesRestricted: form.notesRestricted || null,
  };
}

export default function ProcessRecordingsPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { page, setPage } = useQueryPagination();

  const [viewTarget, setViewTarget] = useState<ProcessRecording | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessRecording | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ProcessRecording | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["process-recordings", page],
    queryFn: () => apiFetch<ApiResponse>(`/api/process-recordings?page=${page}&limit=20`, token ?? undefined),
    enabled: !!token,
  });

  const { data: residentsData } = useQuery({
    queryKey: ["residents-list-for-pr"],
    queryFn: () => apiFetch<{ data: Resident[] }>("/api/residents?limit=200", token ?? undefined),
    enabled: !!token,
  });

  const residents: Resident[] = residentsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      apiPost<ProcessRecording>("/api/process-recordings", body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["process-recordings"] }); closePanel(); },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Failed to save process recording."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiPatch<ProcessRecording>(`/api/process-recordings/${id}`, body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["process-recordings"] }); closePanel(); },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Failed to update process recording."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiDelete(`/api/process-recordings/${id}`, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["process-recordings"] }); setDeleteTarget(null); },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setPanelOpen(true);
  }

  function openEdit(r: ProcessRecording) {
    setEditing(r);
    setForm({
      residentId: r.residentId,
      sessionDate: r.sessionDate ?? "",
      socialWorker: r.socialWorker ?? "",
      sessionType: r.sessionType ?? "",
      sessionDurationMinutes: r.sessionDurationMinutes,
      emotionalStateObserved: r.emotionalStateObserved ?? "",
      emotionalStateEnd: r.emotionalStateEnd ?? "",
      sessionNarrative: r.sessionNarrative ?? "",
      interventionsApplied: r.interventionsApplied ?? "",
      followUpActions: r.followUpActions ?? "",
      progressNoted: r.progressNoted ?? false,
      concernsFlagged: r.concernsFlagged ?? false,
      referralMade: r.referralMade ?? false,
      notesRestricted: r.notesRestricted ?? "",
    });
    setFormError("");
    setPanelOpen(true);
  }

  function closePanel() { setPanelOpen(false); setEditing(null); setFormError(""); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setFormError("Please select a resident."); return; }
    if (!form.sessionDate) { setFormError("Session date is required."); return; }
    const payload = toPayload(form);
    if (editing) updateMutation.mutate({ id: editing.recordingId, body: payload });
    else createMutation.mutate(payload);
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const recordings = (data?.data ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.residentCode?.toLowerCase().includes(q) ||
      r.socialWorker?.toLowerCase().includes(q) ||
      r.sessionType?.toLowerCase().includes(q)
    );
  });

  const totalPages = data?.pagination?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Process Recordings</h1>
          <p className="text-sm text-gray-500 mt-1">Structured counseling session notes for each resident</p>
        </div>
        <Button onClick={openCreate} className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-2">
          <Plus className="w-4 h-4" /> New Recording
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search resident, worker, or type..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Social Worker</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-5 py-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : recordings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No process recordings found</p>
                  {!search && <p className="text-xs mt-1">Use "New Recording" to create the first entry</p>}
                </td>
              </tr>
            ) : recordings.map(r => (
              <tr key={r.recordingId} onClick={() => setViewTarget(r)} className="hover:bg-[#f0faf5] transition-colors group cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#0e2118] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(r.residentCode?.[0] ?? "R").toUpperCase()}
                    </div>
                    <span className="font-mono font-semibold text-gray-900 text-xs">
                      {r.residentCode || `#${r.residentId}`}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-700 text-xs whitespace-nowrap">
                  {r.sessionDate
                    ? new Date(r.sessionDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                    : "—"}
                </td>
                <td className="px-5 py-3.5 text-gray-600 text-xs">
                  {r.socialWorker ?? "—"}
                </td>
                <td className="px-5 py-3.5">
                  {r.sessionType ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                      {r.sessionType}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">
                  {r.sessionDurationMinutes != null ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {r.sessionDurationMinutes} min
                    </span>
                  ) : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {r.progressNoted && (
                      <span title="Progress Noted" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#e6f4ee] text-[#0e6641] border border-[#b3deca]">
                        <CheckCircle2 className="w-3 h-3" /> Progress
                      </span>
                    )}
                    {r.concernsFlagged && (
                      <span title="Concerns Flagged" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Concern
                      </span>
                    )}
                    {r.referralMade && (
                      <span title="Referral Made" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <ChevronRight className="w-3 h-3" /> Referral
                      </span>
                    )}
                    {!r.progressNoted && !r.concernsFlagged && !r.referralMade && (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(r); }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{data?.total ?? 0} total recordings</span>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail View Panel ────────────────────────────────────────── */}
      {viewTarget && !panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setViewTarget(null)} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0e2118]">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-[#7bc5a6]" />
                <div>
                  <h2 className="text-base font-bold text-white">Process Recording</h2>
                  <button
                    onClick={() => viewTarget.residentId && navigate(`/admin/residents/${viewTarget.residentId}`)}
                    className="text-xs text-[#7bc5a6] hover:text-white flex items-center gap-1 transition-colors mt-0.5"
                  >
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Session Date" value={viewTarget.sessionDate ? new Date(viewTarget.sessionDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetailField label="Session Type" value={viewTarget.sessionType} />
                  <DetailField label="Social Worker" value={viewTarget.socialWorker} />
                  <DetailField label="Duration" value={viewTarget.sessionDurationMinutes != null ? `${viewTarget.sessionDurationMinutes} min` : null} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Emotional State</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="At Start of Session" value={viewTarget.emotionalStateObserved} />
                  <DetailField label="At End of Session" value={viewTarget.emotionalStateEnd} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session Content</h3>
                <div className="space-y-4">
                  <DetailField label="Session Narrative" value={viewTarget.sessionNarrative} />
                  <DetailField label="Interventions Applied" value={viewTarget.interventionsApplied} />
                  <DetailField label="Follow-up Actions" value={viewTarget.followUpActions} />
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session Flags</h3>
                <div className="flex flex-wrap gap-2">
                  <FlagChip active={!!viewTarget.progressNoted} color="bg-[#e6f4ee] text-[#0e6641] border border-[#b3deca]" label="Progress Noted" />
                  <FlagChip active={!!viewTarget.concernsFlagged} color="bg-red-50 text-red-700 border border-red-200" label="Concerns Flagged" />
                  <FlagChip active={!!viewTarget.referralMade} color="bg-purple-50 text-purple-700 border border-purple-200" label="Referral Made" />
                  {!viewTarget.progressNoted && !viewTarget.concernsFlagged && !viewTarget.referralMade && <span className="text-gray-400 text-sm italic">No flags recorded</span>}
                </div>
              </section>
              {viewTarget.notesRestricted && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Restricted Notes</h3>
                  <p className="text-xs text-amber-600 mb-2">Confidential — authorized staff only</p>
                  <p className="text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">{viewTarget.notesRestricted}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over Panel ────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#0e2118]">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editing ? "Edit Process Recording" : "New Process Recording"}
                </h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">Philippine Social Welfare Practice Format</p>
              </div>
              <button onClick={closePanel} className="text-gray-300 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Section 1: Session Info */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Resident <span className="text-red-500">*</span></label>
                    <select
                      value={form.residentId ?? ""}
                      onChange={e => set("residentId", e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                      required
                    >
                      <option value="">— Select Resident —</option>
                      {residents.map(r => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.internalCode ?? `#${r.residentId}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Session Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={form.sessionDate}
                        onChange={e => set("sessionDate", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={form.sessionDurationMinutes ?? ""}
                        onChange={e => set("sessionDurationMinutes", e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                        placeholder="e.g. 60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Social Worker</label>
                      <input
                        type="text"
                        value={form.socialWorker}
                        onChange={e => set("socialWorker", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Session Type</label>
                      <select
                        value={form.sessionType}
                        onChange={e => set("sessionType", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                      >
                        <option value="">— Select —</option>
                        {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Emotional State */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Emotional State</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">At Start of Session</label>
                      <select
                        value={form.emotionalStateObserved}
                        onChange={e => set("emotionalStateObserved", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                      >
                        <option value="">— Select —</option>
                        {EMOTIONAL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">At End of Session</label>
                      <select
                        value={form.emotionalStateEnd}
                        onChange={e => set("emotionalStateEnd", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                      >
                        <option value="">— Select —</option>
                        {EMOTIONAL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </div>
                  </div>
              </section>

              {/* Section 3: Session Content */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session Content</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Session Narrative</label>
                    <textarea
                      rows={4}
                      value={form.sessionNarrative}
                      onChange={e => set("sessionNarrative", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="Describe what took place during the session..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Interventions Applied</label>
                    <textarea
                      rows={2}
                      value={form.interventionsApplied}
                      onChange={e => set("interventionsApplied", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="Techniques or approaches used..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Follow-up Actions</label>
                    <textarea
                      rows={2}
                      value={form.followUpActions}
                      onChange={e => set("followUpActions", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                      placeholder="What happens next..."
                    />
                  </div>
                </div>
              </section>

              {/* Section 4: Flags */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session Flags</h3>
                <div className="space-y-2">
                  {(
                    [
                      { key: "progressNoted" as const,   label: "Progress Noted",   sub: "Resident showed measurable improvement" },
                      { key: "concernsFlagged" as const, label: "Concerns Flagged", sub: "Issues requiring immediate attention" },
                      { key: "referralMade" as const,    label: "Referral Made",    sub: "Referred to external service or specialist" },
                    ] as const
                  ).map(({ key, label, sub }) => (
                    <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form[key] ? "border-[#2a9d72] bg-[#f0faf5]" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
                      <input
                        type="checkbox"
                        checked={!!form[key]}
                        onChange={e => set(key, e.target.checked)}
                        className="mt-0.5 accent-[#2a9d72]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Section 5: Restricted Notes */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Restricted Notes</h3>
                <p className="text-xs text-gray-400 mb-2">Confidential — visible to authorized staff only</p>
                <textarea
                  rows={3}
                  value={form.notesRestricted}
                  onChange={e => set("notesRestricted", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                  placeholder="Sensitive observations not for general sharing..."
                />
              </section>

              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
            </form>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button type="button" variant="outline" onClick={closePanel}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="bg-[#2a9d72] hover:bg-[#238c63] text-white"
              >
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Recording"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Recording</h3>
                <p className="text-xs text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete the process recording for{" "}
              <span className="font-mono font-bold">{deleteTarget.residentCode || `#${deleteTarget.residentId}`}</span>
              {deleteTarget.sessionDate && (
                <> on {new Date(deleteTarget.sessionDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</>
              )}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                onClick={() => deleteMutation.mutate(deleteTarget.recordingId)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
