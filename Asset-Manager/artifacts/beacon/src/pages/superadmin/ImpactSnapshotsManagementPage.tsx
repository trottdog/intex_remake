import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, EyeOff, Plus, RefreshCw, TrendingUp, Calendar, AlertTriangle } from "lucide-react";

interface Snapshot {
  id: number;
  snapshotId?: number;
  periodLabel?: string;
  snapshotDate?: string | null;
  headline?: string | null;
  title?: string | null;
  summaryText?: string | null;
  summary?: string | null;
  year?: number;
  quarter?: number | null;
  residentsServed?: number;
  totalDonationsAmount?: number;
  newSupporters?: number;
  isPublished: boolean;
  publishedAt: string | null;
  highlights?: string | null;
}

interface ConfirmAction {
  label: string;
  description: string;
  onConfirm: () => void;
  variant: "publish" | "unpublish";
}

export default function ImpactSnapshotsManagementPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [form, setForm] = useState({ periodLabel: "", year: new Date().getFullYear(), quarter: 1, residentsServed: 0, newSupporters: 0, highlights: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-impact-snapshots"],
    queryFn: () => apiFetch<{ data: Snapshot[] }>("/api/admin/impact-snapshots", token ?? undefined),
    enabled: !!token,
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => apiPost<Snapshot>(`/api/impact-snapshots/${id}/publish`, {}, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-impact-snapshots"] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => apiPost<Snapshot>(`/api/impact-snapshots/${id}/unpublish`, {}, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-impact-snapshots"] }),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => apiPost<Snapshot>("/api/impact-snapshots", body, token ?? undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-impact-snapshots"] }); setShowForm(false); },
  });

  const snapshots = data?.data ?? [];
  const published = snapshots.filter(s => s.isPublished).length;
  const drafts = snapshots.filter(s => !s.isPublished).length;

  return (
    <div className="p-6 space-y-6">
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className={`p-2 rounded-full ${confirm.variant === "unpublish" ? "bg-red-50" : "bg-green-50"}`}>
                <AlertTriangle size={20} className={confirm.variant === "unpublish" ? "text-red-500" : "text-[#2a9d72]"} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{confirm.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{confirm.description}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                className={`px-4 py-2 text-sm rounded-lg font-medium text-white ${confirm.variant === "unpublish" ? "bg-red-500 hover:bg-red-600" : "bg-[#2a9d72] hover:bg-[#238c63]"}`}
              >
                {confirm.label}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impact Snapshots</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and publish periodic impact reports</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#2a9d72] text-white rounded-lg text-sm font-medium hover:bg-[#238c63] transition-colors">
          <Plus size={16} />
          New Snapshot
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">TOTAL</p>
          <p className="text-3xl font-bold text-gray-900">{snapshots.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PUBLISHED</p>
          <p className="text-3xl font-bold text-[#2a9d72]">{published}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">DRAFTS</p>
          <p className="text-3xl font-bold text-orange-500">{drafts}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#2a9d72]/30 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Snapshot</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Period Label</label>
              <input type="text" placeholder="e.g. Q1 2025" value={form.periodLabel} onChange={e => setForm(f => ({ ...f, periodLabel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Year</label>
              <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Residents Served</label>
              <input type="number" value={form.residentsServed} onChange={e => setForm(f => ({ ...f, residentsServed: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">New Supporters</label>
              <input type="number" value={form.newSupporters} onChange={e => setForm(f => ({ ...f, newSupporters: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Highlights</label>
              <textarea value={form.highlights} onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
              className="px-4 py-2 bg-[#2a9d72] text-white rounded-lg text-sm font-medium hover:bg-[#238c63] disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <RefreshCw size={14} className="animate-spin" />}
              Save Draft
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No snapshots yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Residents</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supporters</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Published</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {snapshots.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{s.periodLabel || s.headline || s.title || (s.year ? `${s.year} Q${s.quarter}` : s.snapshotDate?.slice(0, 7) ?? "—")}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10} /> {s.year ?? s.snapshotDate?.slice(0, 4) ?? "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{s.residentsServed ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{s.newSupporters ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.isPublished ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {s.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {s.publishedAt ? new Date(s.publishedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.isPublished ? (
                      <button
                        onClick={() => setConfirm({
                          label: "Unpublish",
                          description: `This will retract "${s.periodLabel || s.headline || s.title || (s.year ? `${s.year} Q${s.quarter}` : s.snapshotDate?.slice(0, 7) ?? "—")}" from the public impact page. Supporters will no longer see it.`,
                          variant: "unpublish",
                          onConfirm: () => unpublishMutation.mutate(s.id),
                        })}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        <EyeOff size={13} /> Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirm({
                          label: "Publish",
                          description: `This will make "${s.periodLabel || s.headline || s.title || (s.year ? `${s.year} Q${s.quarter}` : s.snapshotDate?.slice(0, 7) ?? "—")}" visible on the public impact page.`,
                          variant: "publish",
                          onConfirm: () => publishMutation.mutate(s.id),
                        })}
                        className="flex items-center gap-1 text-xs text-[#2a9d72] hover:text-[#238c63] font-medium"
                      >
                        <Globe size={13} /> Publish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
