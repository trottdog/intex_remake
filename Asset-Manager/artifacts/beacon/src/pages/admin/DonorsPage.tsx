import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import {
  useListSupporters,
  useGetSupporterStats,
  useCreateSupporter,
  useUpdateSupporter,
  useDeleteSupporter,
  type Supporter,
  type SupporterStatsSupportTypeMixItem,
} from "@/services/supporters.service";
import { useCreateDonation, useUpdateDonation, useDeleteDonation } from "@/services/donations.service";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch, apiPost, apiDelete } from "@/services/api";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { SupporterProfileDrawer } from "@/components/supporters/SupporterProfileDrawer";
import {
  Search, Loader2, Users, DollarSign, TrendingUp,
  Layers, Building2, X, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PROGRAM_AREAS = ["Outreach", "Education", "Wellbeing", "Maintenance", "Operations", "Transport"];

interface RichDonation {
  donationId: number;
  supporterId: number | null;
  supporterName: string | null;
  amount: number;
  currencyCode: string | null;
  donationDate: string | null;
  isRecurring: boolean | null;
  channelSource: string | null;
  notes: string | null;
  totalAllocated: number;
  unallocated: number;
  safehouseId: number | null;
  safehouseName: string | null;
}

interface Allocation {
  allocationId: number;
  donationId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
}

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function AllocationBar({ donation }: { donation: RichDonation }) {
  const pct = donation.amount > 0 ? Math.min(100, (donation.totalAllocated / donation.amount) * 100) : 0;
  const done = donation.unallocated <= 0.005;
  return (
    <div className="min-w-[140px]">
      <div className={`text-xs font-semibold mb-1 ${done ? "text-[#2a9d72]" : "text-amber-600"}`}>
        {done ? "Fully allocated" : `${fmt(donation.unallocated)} pending`}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${done ? "bg-[#2a9d72]" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{fmt(donation.totalAllocated)} of {fmt(donation.amount)}</div>
    </div>
  );
}

function AllocateModal({ donation, onClose }: { donation: RichDonation; onClose: () => void }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [programArea, setProgramArea] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);

  const { data: allocData, isLoading: loadingAllocs } = useQuery({
    queryKey: ["donation-allocations", donation.donationId],
    queryFn: () => apiFetch<{ data: Allocation[] }>(`/api/donation-allocations?donationId=${donation.donationId}`, token ?? undefined),
    enabled: !!token,
  });

  const allocations = allocData?.data ?? [];
  const totalAllocated = allocations.reduce((s, a) => s + (a.amountAllocated ?? 0), 0);
  const remaining = Math.max(0, donation.amount - totalAllocated);

  const { mutate: addAlloc, isPending: adding } = useMutation({
    mutationFn: () => apiPost("/api/donation-allocations", {
      donationId: donation.donationId,
      safehouseId: donation.safehouseId,
      programArea,
      amountAllocated: parseFloat(amount),
      allocationNotes: notes || undefined,
    }, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donation-allocations", donation.donationId] });
      qc.invalidateQueries({ queryKey: ["admin-directed-donations"] });
      setProgramArea(""); setAmount(""); setNotes(""); setFormError(null);
    },
    onError: async (err: unknown) => {
      setFormError((err as { message?: string })?.message ?? "Failed to save");
    },
  });

  const { mutate: deleteAlloc, isPending: deleting } = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/donation-allocations/${id}`, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donation-allocations", donation.donationId] });
      qc.invalidateQueries({ queryKey: ["admin-directed-donations"] });
      setDeleteTarget(null);
    },
  });

  function handleAdd() {
    setFormError(null);
    if (!programArea) { setFormError("Please select a program area."); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setFormError("Enter a valid amount greater than zero."); return; }
    if (amt > remaining + 0.01) { setFormError(`Amount exceeds remaining balance of ${fmt(remaining)}.`); return; }
    addAlloc();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Remove allocation?"
        description="This will remove the allocation. The amount becomes available for re-allocation."
        isPending={deleting}
        onConfirm={() => { if (deleteTarget) deleteAlloc(deleteTarget.allocationId); }}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={!deleteTarget ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#0e2118] px-6 pt-6 pb-5 shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#2a9d72]" />
            <span className="text-[#7bc5a6] text-xs font-semibold uppercase tracking-wide">Allocate to Program Area</span>
          </div>
          <h2 className="text-lg font-black text-white">Donation #{donation.donationId}</h2>
          {donation.safehouseName && (
            <div className="mt-1 text-xs text-[#7bc5a6] flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {donation.safehouseName}
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <div>
              <div className="text-white/40 text-xs">Donor</div>
              <div className="text-white font-semibold">{donation.supporterName ?? (donation.supporterId ? `Donor #${donation.supporterId}` : "Anonymous")}</div>
            </div>
            <div>
              <div className="text-white/40 text-xs">Total</div>
              <div className="text-[#2a9d72] font-black">{fmt(donation.amount)}</div>
            </div>
            <div>
              <div className="text-white/40 text-xs">Allocated</div>
              <div className="text-white font-semibold">{fmt(totalAllocated)}</div>
            </div>
            <div>
              <div className="text-white/40 text-xs">Remaining</div>
              <div className={`font-bold ${remaining > 0 ? "text-amber-400" : "text-[#2a9d72]"}`}>{fmt(remaining)}</div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loadingAllocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#2a9d72]" />
            </div>
          ) : allocations.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Existing allocations</h3>
              <div className="space-y-2">
                {allocations.map(a => (
                  <div key={a.allocationId} className="flex items-center justify-between gap-3 bg-[#f8faf9] border border-[#e8f5ee] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-[#2a9d72] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0e2118] truncate">{a.programArea}</div>
                        {a.allocationNotes && <div className="text-xs text-gray-400 truncate">{a.allocationNotes}</div>}
                        {a.allocationDate && <div className="text-xs text-gray-300">{new Date(a.allocationDate).toLocaleDateString("en-PH")}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-[#2a9d72]">{fmt(a.amountAllocated ?? 0)}</span>
                      <button onClick={() => setDeleteTarget(a)} disabled={deleting}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-50 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4" />
              No allocations recorded yet for this donation.
            </div>
          )}

          {remaining > 0.005 && (
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Add allocation · {fmt(remaining)} remaining
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Program area <span className="text-red-400">*</span></label>
                  <select value={programArea} onChange={e => setProgramArea(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white">
                    <option value="">Select area...</option>
                    {PROGRAM_AREAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Amount (PHP) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₱</span>
                    <input type="number" min="1" step="0.01" max={remaining} value={amount}
                      onChange={e => setAmount(e.target.value)} placeholder={`Max ${fmt(remaining)}`}
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]" />
                </div>
              </div>
              {formError && (
                <div className="flex items-center gap-2 mt-3 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
                </div>
              )}
              <button onClick={handleAdd} disabled={adding}
                className="mt-3 w-full py-2.5 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Plus className="w-4 h-4" /> Add Allocation</>}
              </button>
            </div>
          )}

          {remaining <= 0.005 && (
            <div className="flex items-center gap-2 text-[#2a9d72] text-sm bg-[#f0faf5] border border-[#c8e6d4] rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              This donation is fully allocated. Remove an allocation above to add a new one.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

interface SupporterFormValues {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  supporterType: string;
  status: string;
  acquisitionChannel: string;
}

function DonorModal({
  mode,
  initial,
  pending,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: Supporter | null;
  pending: boolean;
  onSave: (payload: SupporterFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SupporterFormValues>({
    displayName: initial?.displayName ?? "",
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    supporterType: initial?.supporterType ?? "individual",
    status: initial?.status ?? "active",
    acquisitionChannel: initial?.acquisitionChannel ?? "online",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!form.displayName.trim() && !`${form.firstName} ${form.lastName}`.trim()) {
      setError("Enter a donor name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save donor.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-[#0e2118]">{mode === "create" ? "Create Donor" : "Edit Donor"}</h2>
          <p className="text-xs text-gray-500 mt-1">Manage donor profile details used for outreach and giving.</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Display name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input placeholder="First name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            <Input placeholder="Last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <select value={form.supporterType} onChange={e => setForm(f => ({ ...f, supporterType: e.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="individual">Individual</option>
              <option value="organization">Organization</option>
            </select>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="paused">Paused</option>
            </select>
            <Input placeholder="Acquisition channel" value={form.acquisitionChannel} onChange={e => setForm(f => ({ ...f, acquisitionChannel: e.target.value }))} />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-[#2a9d72] hover:bg-[#23856a]" onClick={submit} disabled={pending}>
            {pending ? "Saving..." : mode === "create" ? "Create Donor" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContributionsModal({
  supporter,
  donations,
  pending,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: {
  supporter: Supporter;
  donations: RichDonation[];
  pending: boolean;
  onCreate: (payload: { amount: number; donationType: string; donationDate: string; notes?: string; isRecurring: boolean }) => Promise<void>;
  onUpdate: (id: number, payload: { amount: number; donationType: string; donationDate: string; notes?: string; isRecurring: boolean }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<RichDonation | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [donationType, setDonationType] = useState("monetary");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function hydrateFromDonation(d: RichDonation | null) {
    if (!d) {
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setDonationType("monetary");
      setIsRecurring(false);
      setNotes("");
      return;
    }
    setAmount(String(d.amount ?? ""));
    setDate((d.donationDate ?? new Date().toISOString()).slice(0, 10));
    setDonationType(d.amount > 0 ? "monetary" : "in_kind");
    setIsRecurring(Boolean(d.isRecurring));
    setNotes(d.notes ?? "");
  }

  async function saveContribution() {
    setError(null);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    try {
      const payload = { amount: parsedAmount, donationType, donationDate: date, notes: notes || undefined, isRecurring };
      if (editing) {
        await onUpdate(editing.donationId, payload);
      } else {
        await onCreate(payload);
      }
      setEditing(null);
      hydrateFromDonation(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save contribution.");
    }
  }

  const donorName = supporter.displayName || `${supporter.firstName ?? ""} ${supporter.lastName ?? ""}`.trim() || supporter.email || "Donor";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-[#0e2118]">Manage Contributions</h2>
          <p className="text-xs text-gray-500 mt-1">{donorName}</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-5 gap-2">
            <Input className="col-span-1" type="number" min="1" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input className="col-span-1" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <select value={donationType} onChange={e => setDonationType(e.target.value)} className="col-span-1 h-10 rounded-md border border-input px-3 text-sm">
              <option value="monetary">Monetary</option>
              <option value="in_kind">In-kind</option>
            </select>
            <Input className="col-span-1" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            <button onClick={saveContribution} disabled={pending}
              className="col-span-1 rounded-md bg-[#2a9d72] hover:bg-[#23856a] text-white text-sm font-semibold">
              {editing ? "Save" : "Add"}
            </button>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
            Recurring contribution
          </label>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Date</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Type</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {donations.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-sm">No contributions yet.</td></tr>
                ) : donations.map(d => (
                  <tr key={d.donationId} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-600">{fmtDate(d.donationDate)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{d.amount > 0 ? "Monetary" : "In-kind"}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-[#0e2118]">{fmt(d.amount)}</td>
                    <td className="px-3 py-2 flex items-center gap-2">
                      <button onClick={() => { setEditing(d); hydrateFromDonation(d); }} className="text-xs text-[#2a9d72] hover:underline">Edit</button>
                      <button onClick={() => void onDelete(d.donationId)} className="text-xs text-red-500 hover:underline" disabled={pending}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <Button variant="outline" className="w-full" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

export default function DonorsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"supporters" | "donations">("supporters");
  const [donorModal, setDonorModal] = useState<{ mode: "create" | "edit"; supporter: Supporter | null } | null>(null);
  const [supporterDeleteTarget, setSupporterDeleteTarget] = useState<Supporter | null>(null);
  const [selectedSupporterId, setSelectedSupporterId] = useState<number | null>(null);
  const [contributionsSupporter, setContributionsSupporter] = useState<Supporter | null>(null);
  const [search, setSearch] = useState("");
  const [donorSearch, setDonorSearch] = useState("");
  const [allocFilter, setAllocFilter] = useState<"all" | "unallocated" | "allocated">("all");
  const [selectedDonation, setSelectedDonation] = useState<RichDonation | null>(null);
  const { page, pageSize, setPage } = useQueryPagination();
  const createSupporter = useCreateSupporter();
  const updateSupporter = useUpdateSupporter();
  const deleteSupporter = useDeleteSupporter();
  const createDonation = useCreateDonation();
  const updateDonation = useUpdateDonation();
  const deleteDonation = useDeleteDonation();

  const { data, isLoading: loadingSupps } = useListSupporters({ page, pageSize });
  const { data: stats } = useGetSupporterStats();

  const { data: donationsData, isLoading: loadingDonations } = useQuery({
    queryKey: ["admin-directed-donations"],
    queryFn: () => apiFetch<{ data: RichDonation[]; total: number }>("/api/donations?pageSize=100", token ?? undefined),
    enabled: !!token,
  });

  const allDonations = donationsData?.data ?? [];

  const donationTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const filtered = allDonations.filter(don =>
        don.donationDate && String(don.donationDate).startsWith(monthStr)
      );
      return {
        label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        amount: filtered.reduce((s, don) => s + don.amount, 0),
        count: filtered.length,
      };
    });
  }, [allDonations]);

  const filteredDonations = allDonations.filter(d => {
    const matchSearch = !donorSearch
      || (d.supporterName ?? "").toLowerCase().includes(donorSearch.toLowerCase())
      || String(d.donationId).includes(donorSearch);
    const matchAlloc = allocFilter === "all"
      || (allocFilter === "unallocated" && d.unallocated > 0.005)
      || (allocFilter === "allocated" && d.unallocated <= 0.005);
    return matchSearch && matchAlloc;
  });

  const totalReceived = allDonations.reduce((s, d) => s + d.amount, 0);
  const totalAllocated = allDonations.reduce((s, d) => s + d.totalAllocated, 0);
  const pendingCount = allDonations.filter(d => d.unallocated > 0.005).length;

  const filteredSupps = (data?.data ?? []).filter((s: Supporter) =>
    !search || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  );
  const contributionsForSelected = contributionsSupporter
    ? allDonations.filter(d => d.supporterId === (contributionsSupporter.supporterId ?? contributionsSupporter.id ?? -1))
    : [];

  return (
    <div className="space-y-6">
      <DeleteConfirmModal
        open={!!supporterDeleteTarget}
        title="Delete donor?"
        description="This permanently deletes the donor profile. Linked donations are retained unless deleted separately."
        isPending={deleteSupporter.isPending}
        onConfirm={() => {
          const id = supporterDeleteTarget?.supporterId ?? supporterDeleteTarget?.id;
          if (id) {
            deleteSupporter.mutate(id, { onSuccess: () => setSupporterDeleteTarget(null) });
          }
        }}
        onCancel={() => setSupporterDeleteTarget(null)}
      />
      {donorModal && (
        <DonorModal
          mode={donorModal.mode}
          initial={donorModal.supporter}
          pending={createSupporter.isPending || updateSupporter.isPending}
          onSave={async (values) => {
            if (donorModal.mode === "create") {
              await createSupporter.mutateAsync(values);
              return;
            }
            const id = donorModal.supporter?.supporterId ?? donorModal.supporter?.id;
            if (!id) throw new Error("Missing supporter id.");
            await updateSupporter.mutateAsync({ id, payload: values as unknown as Record<string, unknown> });
          }}
          onClose={() => setDonorModal(null)}
        />
      )}
      {contributionsSupporter && (
        <ContributionsModal
          supporter={contributionsSupporter}
          donations={contributionsForSelected}
          pending={createDonation.isPending || updateDonation.isPending || deleteDonation.isPending}
          onCreate={async (payload) => {
            const supporterId = contributionsSupporter.supporterId ?? contributionsSupporter.id;
            if (!supporterId) throw new Error("Missing supporter id.");
            await createDonation.mutateAsync({ ...payload, supporterId, currencyCode: "PHP", channelSource: "manual_entry" });
          }}
          onUpdate={async (id, payload) => {
            await updateDonation.mutateAsync({ id, payload });
          }}
          onDelete={async (id) => {
            await deleteDonation.mutateAsync(id);
          }}
          onClose={() => setContributionsSupporter(null)}
        />
      )}
      {selectedDonation && <AllocateModal donation={selectedDonation} onClose={() => setSelectedDonation(null)} />}
      <SupporterProfileDrawer
        open={selectedSupporterId !== null}
        supporterId={selectedSupporterId}
        onClose={() => setSelectedSupporterId(null)}
        onEdit={(supporter) => setDonorModal({ mode: "edit", supporter })}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donors & Supporter Giving</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supporter relationships and allocate directed donations</p>
        </div>
        {tab === "supporters" && (
          <Button className="bg-[#2a9d72] hover:bg-[#23856a]" onClick={() => setDonorModal({ mode: "create", supporter: null })}>
            <Plus className="w-4 h-4 mr-1" />
            Create Donor
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "supporters", icon: Users, label: "All Supporters" },
          { key: "donations",  icon: DollarSign, label: `Directed Donations${pendingCount > 0 && tab !== "donations" ? ` (${pendingCount} pending)` : ""}` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? "bg-white text-[#0e2118] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "supporters" && (
        <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Supporters", value: stats?.totalSupporters ?? "—", color: "" },
              { label: "Recurring Donors",  value: stats?.recurringDonors ?? "—",  color: "text-[#2a9d72]" },
              { label: "Avg Gift Size",     value: stats ? `₱${(stats.avgGiftSize ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—", color: "" },
              { label: "Raised This Month", value: stats ? `₱${(stats.raisedThisMonth ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—", color: "text-[#2a9d72]" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {stats && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">Acquisition by Channel</h3>
                {(stats.acquisitionByChannel ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.acquisitionByChannel} margin={{ left: -20 }}>
                      <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Supporters"]} />
                      <Bar dataKey="count" fill="#2a9d72" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No channel data yet</p>
                )}
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">Supporter Type Mix</h3>
                {(stats.supportTypeMix ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {stats.supportTypeMix?.map((t: SupporterStatsSupportTypeMixItem, i: number) => (
                      <div key={`${t.type}-${i}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize text-gray-700">{t.type}</span>
                          <span className="text-gray-500">{t.count} ({t.percentage?.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2a9d72] rounded-full" style={{ width: `${t.percentage ?? 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No type data yet</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search supporters by name or email..." className="pl-9"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Lifetime Giving</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Gifts</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Gift</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Recurring</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingSupps ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={`skel-${i}`}><td colSpan={9} className="px-4 py-3"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filteredSupps.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">No supporters found</td></tr>
                ) : filteredSupps.map((s: Supporter) => {
                  const name = s.displayName || `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || s.organizationName || "—";
                  const isRecurring = s.recurringEnabled || s.hasRecurring;
                  const statusColor = s.status === "active" || !s.status
                    ? "bg-green-100 text-green-700"
                    : s.status === "inactive" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700";
                  return (
                    <tr
                      key={s.supporterId ?? s.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        const id = Number(s.supporterId ?? s.id ?? 0);
                        if (id > 0) {
                          setSelectedSupporterId(id);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="text-xs text-gray-500">{s.email ?? "—"}</div>
                        {s.region && <div className="text-xs text-gray-400">{s.region}{s.country ? `, ${s.country}` : ""}</div>}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600 text-xs">{s.supporterType ?? "—"}</td>
                      <td className="px-4 py-3 capitalize text-gray-500 text-xs">{s.acquisitionChannel ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-[#0e2118]">
                        ₱{Number(s.lifetimeGiving || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs text-center">{s.donationCount ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.lastGiftDate ? new Date(s.lastGiftDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor}`}>
                          {s.status ?? "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#2a9d72] font-medium">
                            <Heart className="w-3 h-3" /> Yes
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs text-[#2a9d72] hover:underline"
                            onClick={() => {
                              const id = Number(s.supporterId ?? s.id ?? 0);
                              if (id > 0) {
                                setSelectedSupporterId(id);
                              }
                            }}
                          >
                            View
                          </button>
                          <button
                            className="text-xs text-[#2a9d72] hover:underline"
                            onClick={() => setDonorModal({ mode: "edit", supporter: s })}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-gray-500 hover:underline"
                            onClick={() => setContributionsSupporter(s)}
                          >
                            Contributions
                          </button>
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => setSupporterDeleteTarget(s)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(data?.total ?? 0) > pageSize && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Total: {data?.total ?? 0} supporters</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil((data?.total ?? 1) / pageSize)} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "donations" && (
        <>
          <div className="flex items-center gap-2 bg-[#f0faf6] border border-[#c8e6d4] text-[#0e2118] text-sm rounded-xl px-4 py-3">
            <Building2 className="w-4 h-4 text-[#2a9d72] shrink-0" />
            <span>Donation records from all channels. Allocate each one to a program area to track fund usage.</span>
          </div>

          {/* ── Donation Trend Chart ── */}
          {!loadingDonations && donationTrend.some(m => m.amount > 0) && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Donations Over Time</h3>
                <span className="text-xs text-gray-400">Last 12 months</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={donationTrend} margin={{ left: -10, right: 8 }}>
                  <defs>
                    <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2a9d72" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2a9d72" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === "amount"
                        ? [`₱${v.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`, "Amount"]
                        : [v, "Donations"]
                    }
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="amount"
                    stroke="#2a9d72"
                    strokeWidth={2}
                    fill="url(#donGrad)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 flex gap-6 text-xs text-gray-400">
                <span>Total: <span className="font-semibold text-gray-700">₱{totalReceived.toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span></span>
                <span>Transactions: <span className="font-semibold text-gray-700">{allDonations.length}</span></span>
                <span>Peak month: <span className="font-semibold text-gray-700">
                  {donationTrend.reduce((a, b) => b.amount > a.amount ? b : a, donationTrend[0])?.label ?? "—"}
                </span></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: DollarSign, label: "Total Received",      value: `₱${totalReceived.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`,  color: "#2a9d72" },
              { icon: TrendingUp, label: "Total Allocated",     value: `₱${totalAllocated.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`,  color: "#457b9d" },
              { icon: AlertCircle, label: "Pending Allocation", value: String(pendingCount),                                                         color: "#f4a261" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by donor name or donation ID..."
                value={donorSearch} onChange={e => setDonorSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]" />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(["all", "unallocated", "allocated"] as const).map(f => (
                <button key={f} onClick={() => setAllocFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${allocFilter === f ? "bg-white text-[#0e2118] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {f === "unallocated" ? "Pending" : f === "allocated" ? "Allocated" : "All"}
                </button>
              ))}
            </div>
          </div>

          {loadingDonations ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-7 h-7 animate-spin text-[#2a9d72]" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filteredDonations.length === 0 ? (
                <div className="py-16 text-center">
                  <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">No directed donations yet</p>
                  <p className="text-gray-300 text-xs mt-1">When donors direct a gift to your safehouse it will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Donor</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[180px]">Allocation Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredDonations.map(d => (
                        <tr key={d.donationId} className="hover:bg-[#f8faf9] transition-colors cursor-pointer" onClick={() => setSelectedDonation(d)}>
                          <td className="px-5 py-4 text-gray-400 font-mono text-xs">#{d.donationId}</td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-800 text-sm">
                              {d.supporterName ?? (d.supporterId ? `Donor #${d.supporterId}` : <span className="text-gray-400 italic">Anonymous</span>)}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              {d.isRecurring && <><RefreshCw className="w-3 h-3 text-[#2a9d72]" /><span className="text-[#2a9d72]">Monthly</span></>}
                              {d.channelSource && <span className="capitalize">{d.channelSource}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-base font-black text-[#0e2118]">₱{d.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                            <div className="text-xs text-gray-400">{d.currencyCode ?? "PHP"}</div>
                          </td>
                          <td className="px-5 py-4 text-gray-500 text-xs">{fmtDate(d.donationDate)}</td>
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <AllocationBar donation={d} />
                          </td>
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedDonation(d)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${d.unallocated > 0.005 ? "bg-[#0e2118] text-white hover:bg-[#1a3528]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                              <Layers className="w-3.5 h-3.5" />
                              {d.unallocated > 0.005 ? "Allocate" : "Review"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
