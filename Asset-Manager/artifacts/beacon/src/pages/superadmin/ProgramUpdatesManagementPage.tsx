import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import {
  Plus, Pencil, Trash2, Loader2, X, CheckCircle, Clock,
  Eye, EyeOff, FileText, Tag,
} from "lucide-react";

const CATEGORIES = ["Announcement", "Success Story", "Infrastructure", "Partnership", "Program Update", "Milestone", "Other"];

interface ProgramUpdate {
  updateId: number;
  title: string;
  summary: string | null;
  category: string | null;
  isPublished: boolean | null;
  publishedAt: string | null;
  createdAt: string | null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function UpdateFormModal({
  initial,
  onClose,
}: {
  initial?: ProgramUpdate | null;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    summary: initial?.summary ?? "",
    category: initial?.category ?? "",
    isPublished: initial?.isPublished ?? false,
  });
  const [error, setError] = useState<string | null>(null);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => isEdit
      ? apiPatch(`/api/program-updates/${initial!.updateId}`, form, token ?? undefined)
      : apiPost("/api/program-updates", form, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-updates"] });
      qc.invalidateQueries({ queryKey: ["donor-notifications"] });
      onClose();
    },
    onError: async (err: unknown) => {
      setError((err as { message?: string })?.message ?? "Failed to save");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setError(null);
    save();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-[#0e2118] px-6 pt-5 pb-4">
          <button onClick={onClose} disabled={isPending} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-0.5">
            <FileText className="w-4 h-4 text-[#2a9d72]" />
            <span className="text-[#2a9d72] text-xs font-bold uppercase tracking-wide">
              {isEdit ? "Edit Update" : "New Program Update"}
            </span>
          </div>
          <h2 className="text-lg font-black text-white">{isEdit ? initial!.title : "Create Update"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title <span className="text-red-400">*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
              placeholder="Update title..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white"
            >
              <option value="">Select category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</label>
            <textarea
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
              placeholder="Describe this program update..."
            />
          </div>

          <div className="flex items-center justify-between bg-[#f8faf9] border border-[#e8f5ee] rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[#0e2118]">Publish immediately</div>
              <div className="text-xs text-gray-400">Donors will see this update right away</div>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isPublished ? "bg-[#2a9d72]" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isPending}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 bg-[#2a9d72] text-white rounded-xl text-sm font-bold hover:bg-[#23856a] disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (isEdit ? "Save Changes" : "Create Update")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProgramUpdatesManagementPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProgramUpdate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgramUpdate | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["program-updates"],
    queryFn: () => apiFetch<{ data: ProgramUpdate[] }>("/api/program-updates", token ?? undefined),
    enabled: !!token,
  });

  const updates = data?.data ?? [];

  const { mutate: togglePublish, isPending: toggling } = useMutation({
    mutationFn: (u: ProgramUpdate) => apiPatch(`/api/program-updates/${u.updateId}`, {
      isPublished: !u.isPublished,
    }, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-updates"] });
      qc.invalidateQueries({ queryKey: ["donor-notifications"] });
    },
  });

  const { mutate: deleteUpdate, isPending: deleting } = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/program-updates/${id}`, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-updates"] });
      qc.invalidateQueries({ queryKey: ["donor-notifications"] });
      setDeleteTarget(null);
    },
  });

  const published = updates.filter(u => u.isPublished).length;
  const drafts = updates.filter(u => !u.isPublished).length;

  const categoryColor: Record<string, string> = {
    "Announcement": "bg-blue-50 text-blue-700",
    "Success Story": "bg-green-50 text-green-700",
    "Infrastructure": "bg-purple-50 text-purple-700",
    "Partnership": "bg-indigo-50 text-indigo-700",
    "Program Update": "bg-teal-50 text-teal-700",
    "Milestone": "bg-amber-50 text-amber-700",
    "Other": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-6">
      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete program update?"
        itemName={deleteTarget?.title ?? undefined}
        isPending={deleting}
        onConfirm={() => deleteTarget && deleteUpdate(deleteTarget.updateId)}
        onCancel={() => setDeleteTarget(null)}
      />
      {(showForm || editing) && (
        <UpdateFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Program Updates</h1>
          <p className="text-sm text-gray-500 mt-1">Publish updates that donors see in their portal</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] transition-colors"
        >
          <Plus className="w-4 h-4" /> New Update
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: updates.length, color: "#0e2118" },
          { label: "Published", value: published, color: "#2a9d72" },
          { label: "Drafts", value: drafts, color: "#f4a261" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-7 h-7 animate-spin text-[#2a9d72]" />
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No updates yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(u => (
            <div key={u.updateId} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {u.isPublished
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2a9d72] bg-[#f0faf5] border border-[#c8e6d4] px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Published</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Draft</span>
                  }
                  {u.category && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${categoryColor[u.category] ?? "bg-gray-100 text-gray-600"}`}>
                      <Tag className="w-2.5 h-2.5" />{u.category}
                    </span>
                  )}
                  <span className="text-xs text-gray-300 ml-auto">{u.isPublished ? `Published ${fmtDate(u.publishedAt)}` : `Created ${fmtDate(u.createdAt)}`}</span>
                </div>
                <h3 className="font-bold text-gray-900">{u.title}</h3>
                {u.summary && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{u.summary}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => togglePublish(u)}
                  disabled={toggling}
                  title={u.isPublished ? "Unpublish" : "Publish"}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#2a9d72] hover:bg-[#f0faf5] transition-colors disabled:opacity-40"
                >
                  {u.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditing(u)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#0e2118] hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(u)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
