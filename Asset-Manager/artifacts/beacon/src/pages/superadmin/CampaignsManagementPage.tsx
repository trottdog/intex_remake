import { useState } from "react";
import {
  useListCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign,
  type Campaign,
} from "@/services/campaigns.service";
import {
  Target, Plus, Pencil, Trash2, Loader2, AlertTriangle, X,
  CheckCircle, Clock, FileText, TrendingUp, Users,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

type CampaignStatus = "draft" | "active" | "completed";

const CATEGORIES = ["General Support", "Education", "Health", "Infrastructure", "Psychosocial Support", "Reintegration", "Other"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-[#2a9d72]/10 text-[#2a9d72]",
    completed: "bg-gray-100 text-gray-500",
    draft:     "bg-amber-50 text-amber-600",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// ── CAMPAIGN FORM MODAL ───────────────────────────────────────────────────────
function CampaignFormModal({
  initial,
  onClose,
}: {
  initial?: Campaign | null;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const isPending = create.isPending || update.isPending;

  const [form, setForm] = useState({
    title:       initial?.title ?? "",
    description: initial?.description ?? "",
    category:    initial?.category ?? "",
    goal:        initial?.goal ? String(initial.goal) : "",
    deadline:    initial?.deadline ?? "",
    status:      (initial?.status ?? "draft") as CampaignStatus,
  });
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError("Title is required."); return; }

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      category:    form.category || null,
      goal:        form.goal ? parseFloat(form.goal) : null,
      deadline:    form.deadline || null,
      status:      form.status,
    };

    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.campaignId, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Failed to save campaign. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-[#f8fafc] border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{isEdit ? "Edit Campaign" : "Create Campaign"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? "Update campaign details" : "Add a new fundraising campaign"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Campaign Title *
            </label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Year-End Hope Campaign"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Describe the campaign purpose and goals..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value as CampaignStatus)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Fundraising Goal (PHP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.goal}
                  onChange={e => set("goal", e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Deadline
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => set("deadline", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0e2118] hover:bg-[#1a3a28] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-bold transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CampaignsManagementPage() {
  const { data, isLoading, error } = useListCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Campaign | null>(null);
  const [deleting, setDeleting]     = useState<Campaign | null>(null);

  const campaigns = data?.data ?? [];
  const active    = campaigns.filter(c => c.status === "active").length;
  const completed = campaigns.filter(c => c.status === "completed").length;
  const draft     = campaigns.filter(c => c.status === "draft").length;
  const totalRaised = campaigns.reduce((s, c) => s + (c.totalRaised ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage fundraising campaigns. Donors see active campaigns in their portal.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#0e2118] hover:bg-[#1a3a28] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* KPIs */}
      {!isLoading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Campaigns", value: campaigns.length, icon: Target, color: "#2a9d72" },
            { label: "Active",          value: active,           icon: Clock,   color: "#457b9d" },
            { label: "Completed",       value: completed,        icon: CheckCircle, color: "#e9c46a" },
            { label: "Total Raised",    value: `₱${totalRaised.toLocaleString()}`, icon: TrendingUp, color: "#e76f51" },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${k.color}18` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div>
                <div className="text-base font-bold text-gray-900">{k.value}</div>
                <div className="text-xs text-gray-400">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">All Campaigns</h3>
            <p className="text-xs text-gray-400 mt-0.5">{data?.total ?? 0} total</p>
          </div>
          <FileText className="w-4 h-4 text-gray-300" />
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#2a9d72]" />
          </div>
        ) : error ? (
          <div className="py-10 flex items-center justify-center gap-2 text-amber-600 text-sm">
            <AlertTriangle className="w-4 h-4" /> Failed to load campaigns
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Target className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No campaigns yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "New Campaign" to create your first one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Title</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Category</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Goal</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Raised</th>
                  <th className="text-center px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Donors</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Deadline</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map(c => {
                  const pct = c.goal && c.goal > 0 ? Math.min(Math.round((c.totalRaised / c.goal) * 100), 100) : null;
                  return (
                    <tr key={c.campaignId} className="hover:bg-[#f8faf9] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{c.title}</div>
                        {c.description && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{c.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{c.category ?? "—"}</td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 text-right text-gray-700 font-medium">
                        {c.goal ? `₱${c.goal.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-[#0e2118]">₱{c.totalRaised.toLocaleString()}</div>
                        {pct !== null && (
                          <div className="text-xs text-gray-400">{pct}%</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <Users className="w-3 h-3" />
                          <span className="text-sm">{c.donorCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{fmtDate(c.deadline)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => setEditing(c)}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#2a9d72] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(c)}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CampaignFormModal onClose={() => setShowCreate(false)} />}
      {editing   && <CampaignFormModal initial={editing} onClose={() => setEditing(null)} />}
      <DeleteConfirmModal
        open={!!deleting}
        title="Delete Campaign?"
        itemName={deleting?.title ?? undefined}
        description="Existing donations linked to this campaign will be retained but unlinked."
        isPending={deleteCampaign.isPending}
        onConfirm={() => deleting && deleteCampaign.mutate(deleting.campaignId, { onSuccess: () => setDeleting(null) })}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
