import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { AdminDonationEntryModal } from "@/components/donations/AdminDonationEntryModal";
import {
  DollarSign, TrendingUp, Users, Search, Layers,
  X, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, RefreshCw, Pencil,
  Globe, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PROGRAM_AREAS = ["Outreach", "Education", "Wellbeing", "Maintenance", "Operations", "Transport"];

interface RichDonation {
  donationId: number;
  supporterId: number | null;
  supporterName: string | null;
  amount: number | null;
  estimatedValue?: number | null;
  currencyCode: string | null;
  donationDate: string | null;
  donationType: string | null;
  campaignName: string | null;
  channelSource: string | null;
  isRecurring: boolean | null;
  notes: string | null;
  totalAllocated: number | null;
  unallocated: number | null;
  safehouseId: number | null;
  safehouseName: string | null;
  isGeneralFund: boolean;
}

interface Allocation {
  allocationId: number;
  donationId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
  safehouseName?: string | null;
}

interface Safehouse {
  safehouseId: number;
  safehouseName: string | null;
}

interface CreatedSupporter {
  supporterId?: number | null;
  id?: number | null;
}

type SupporterType = "individual" | "organization";

type DonorDraft = {
  supporterType: SupporterType;
  displayName: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  email: string;
  phone: string;
};

type MonetaryEntryPayload = DonorDraft & {
  amount: number;
  donationDate: string;
  isRecurring: boolean;
  notes?: string;
  safehouseId?: number | null;
};

type InKindItemDraft = {
  itemName: string;
  itemCategory: string;
  quantity: string;
  unitOfMeasure: string;
  estimatedUnitValue: string;
  intendedUse: string;
  receivedCondition: string;
};

type InKindEntryPayload = DonorDraft & {
  notes?: string;
  safehouseId?: number | null;
  items: Array<{
    itemName: string;
    itemCategory?: string;
    quantity: number;
    unitOfMeasure?: string;
    estimatedUnitValue?: number;
    intendedUse?: string;
    receivedCondition?: string;
  }>;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]";
const SELECT_CLASS = `${INPUT_CLASS} bg-white`;
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] resize-y`;

function resolveDonorName(donor: DonorDraft): string {
  if (donor.supporterType === "organization") {
    return donor.organizationName.trim() || donor.displayName.trim();
  }
  return donor.displayName.trim() || `${donor.firstName} ${donor.lastName}`.trim();
}

function extractSupporterId(result: CreatedSupporter | null | undefined): number | null {
  return result?.supporterId ?? result?.id ?? null;
}

function blankItem(): InKindItemDraft {
  return {
    itemName: "",
    itemCategory: "",
    quantity: "1",
    unitOfMeasure: "",
    estimatedUnitValue: "",
    intendedUse: "",
    receivedCondition: "",
  };
}

function fmt(n: number | null | undefined) {
  return `₱${(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AllocationStatus({ donation }: { donation: RichDonation }) {
  const amt = donation.amount ?? 0;
  const alloc = donation.totalAllocated ?? 0;
  const unalloc = donation.unallocated ?? 0;
  const pct = amt > 0 ? Math.min(100, (alloc / amt) * 100) : 0;
  const fullyAllocated = unalloc <= 0;
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-semibold ${fullyAllocated ? "text-[#2a9d72]" : "text-amber-600"}`}>
          {fullyAllocated ? "Fully allocated" : `${fmt(unalloc)} pending`}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${fullyAllocated ? "bg-[#2a9d72]" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{fmt(alloc)} of {fmt(amt)}</div>
    </div>
  );
}

function AllocateModal({
  donation, safehouses, onClose,
}: {
  donation: RichDonation;
  safehouses: Safehouse[];
  onClose: () => void;
}) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const isDirected = !donation.isGeneralFund;

  const [safehouseId, setSafehouseId] = useState<number | "">(isDirected && donation.safehouseId ? donation.safehouseId : "");
  const [programArea, setProgramArea] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);

  const { data: allocationsData, isLoading: loadingAllocs } = useQuery({
    queryKey: ["donation-allocations", donation.donationId],
    queryFn: () => apiFetch<{ data: Allocation[] }>(`/api/donation-allocations?donationId=${donation.donationId}`, token ?? undefined),
    enabled: !!token,
  });

  const allocations = allocationsData?.data ?? [];
  const totalAllocated = allocations.reduce((s, a) => s + (a.amountAllocated ?? 0), 0);
  const remaining = Math.max(0, (donation.amount ?? 0) - totalAllocated);

  const { mutate: addAllocation, isPending: adding } = useMutation({
    mutationFn: () => apiPost("/api/donation-allocations", {
      donationId: donation.donationId,
      safehouseId: isDirected ? donation.safehouseId : Number(safehouseId),
      programArea,
      amountAllocated: parseFloat(amount),
      allocationNotes: notes || undefined,
    }, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donation-allocations", donation.donationId] });
      qc.invalidateQueries({ queryKey: ["admin-donations"] });
      qc.invalidateQueries({ queryKey: ["donor", "dashboard"] });
      if (!isDirected) setSafehouseId("");
      setProgramArea(""); setAmount(""); setNotes(""); setFormError(null);
    },
    onError: async (err: unknown) => {
      setFormError((err as { message?: string })?.message ?? "Failed to save allocation");
    },
  });

  const { mutate: deleteAllocation, isPending: deleting } = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/donation-allocations/${id}`, token ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donation-allocations", donation.donationId] });
      qc.invalidateQueries({ queryKey: ["admin-donations"] });
    },
  });

  function handleAdd() {
    setFormError(null);
    if (!isDirected && !safehouseId) { setFormError("Please select a safehouse."); return; }
    if (!programArea) { setFormError("Please select a program area."); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setFormError("Enter a valid amount greater than zero."); return; }
    if (amt > remaining + 0.01) { setFormError(`Amount exceeds remaining unallocated balance of ${fmt(remaining)}.`); return; }
    addAllocation();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Remove allocation?"
        description="This will remove the allocation record. The donation amount will become available for re-allocation."
        isPending={deleting}
        onConfirm={() => { if (deleteTarget) { deleteAllocation(deleteTarget.allocationId); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={!deleteTarget ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="bg-[#0e2118] px-6 pt-6 pb-5 shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#2a9d72]" />
            <span className="text-[#2a9d72] text-xs font-semibold uppercase tracking-wide">Allocate Donation</span>
          </div>
          <h2 className="text-lg font-black text-white">Donation #{donation.donationId}</h2>
          {isDirected && (
            <div className="mt-1 inline-flex items-center gap-1.5 bg-[#2a9d72]/20 text-[#7bc5a6] text-xs font-semibold px-2.5 py-1 rounded-full">
              <Building2 className="w-3 h-3" />
              Directed: {donation.safehouseName ?? `Safehouse #${donation.safehouseId}`}
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <div>
              <div className="text-white/40 text-xs">Donor</div>
              <div className="text-white font-semibold">{donation.supporterName ?? (donation.supporterId ? `Donor #${donation.supporterId}` : "Anonymous")}</div>
            </div>
            <div>
              <div className="text-white/40 text-xs">Total amount</div>
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
                        <div className="text-sm font-semibold text-[#0e2118] truncate">
                          {a.programArea}
                          {a.safehouseName && <span className="text-gray-400 font-normal ml-1">— {a.safehouseName}</span>}
                        </div>
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
                <Plus className="w-3.5 h-3.5" />
                Add allocation · {fmt(remaining)} remaining
              </h3>

              <div className={`grid gap-3 ${isDirected ? "grid-cols-2" : "grid-cols-2"}`}>
                {!isDirected && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Safehouse <span className="text-red-400">*</span></label>
                    <select value={safehouseId} onChange={e => setSafehouseId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white">
                      <option value="">Select safehouse...</option>
                      {safehouses.map(s => (
                        <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseName ?? `Safehouse #${s.safehouseId}`}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Program area <span className="text-red-400">*</span></label>
                  <select value={programArea} onChange={e => setProgramArea(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white">
                    <option value="">Select program area...</option>
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

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allocation notes..."
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

function EditDonationModal({
  donation,
  safehouses,
  pending,
  onSave,
  onClose,
}: {
  donation: RichDonation;
  safehouses: Safehouse[];
  pending: boolean;
  onSave: (id: number, payload: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const donationType = donation.donationType === "in_kind" ? "in_kind" : "monetary";
  const [type, setType] = useState<"monetary" | "in_kind">(donationType);
  const [valueInput, setValueInput] = useState(
    String(donationType === "in_kind" ? donation.estimatedValue ?? "" : donation.amount ?? ""),
  );
  const [date, setDate] = useState((donation.donationDate ?? new Date().toISOString()).slice(0, 10));
  const [safehouseId, setSafehouseId] = useState<number | "">(donation.safehouseId ?? "");
  const [isRecurring, setIsRecurring] = useState(Boolean(donation.isRecurring));
  const [notes, setNotes] = useState(donation.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const parsedValue = Number(valueInput);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError(type === "monetary" ? "Enter a valid donation amount." : "Enter a valid estimated value.");
      return;
    }
    if (type === "monetary" && parsedValue <= 0) {
      setError("Monetary donations must be greater than zero.");
      return;
    }

    try {
      await onSave(donation.donationId, {
        donationType: type,
        donationDate: date,
        amount: type === "monetary" ? parsedValue : null,
        estimatedValue: type === "in_kind" ? parsedValue : null,
        impactUnit: type === "in_kind" ? "items" : null,
        isRecurring: type === "monetary" ? isRecurring : false,
        notes: notes.trim() || null,
        safehouseId: safehouseId === "" ? null : safehouseId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update the donation.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 pb-4 pt-6">
          <h2 className="text-lg font-black text-[#0e2118]">Edit Donation</h2>
          <p className="mt-1 text-xs text-gray-500">
            {donation.supporterName ?? (donation.supporterId ? `Donor #${donation.supporterId}` : "Anonymous donor")}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <select value={type} onChange={(e) => setType(e.target.value as "monetary" | "in_kind")} className={SELECT_CLASS}>
              <option value="monetary">Monetary</option>
              <option value="in_kind">In-kind</option>
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} />

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₱</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder={type === "monetary" ? "Donation amount" : "Estimated value"}
                className={`${INPUT_CLASS} pl-7`}
              />
            </div>

            <select
              value={safehouseId}
              onChange={(e) => setSafehouseId(e.target.value === "" ? "" : Number(e.target.value))}
              className={SELECT_CLASS}
            >
              <option value="">General fund</option>
              {safehouses.map((safehouse) => (
                <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                  {safehouse.safehouseName ?? `Safehouse #${safehouse.safehouseId}`}
                </option>
              ))}
            </select>
          </div>

          {type === "monetary" ? (
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              Recurring donation
            </label>
          ) : null}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className={TEXTAREA_CLASS}
          />

          {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div> : null}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={pending}
            className="flex-1 rounded-xl bg-[#2a9d72] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#23856a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MonetaryDonationModal({
  safehouses,
  pending,
  onSave,
  onClose,
}: {
  safehouses: Safehouse[];
  pending: boolean;
  onSave: (payload: MonetaryEntryPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MonetaryEntryPayload>({
    supporterType: "individual",
    displayName: "",
    firstName: "",
    lastName: "",
    organizationName: "",
    email: "",
    phone: "",
    amount: 0,
    donationDate: new Date().toISOString().slice(0, 10),
    isRecurring: false,
    notes: "",
    safehouseId: null,
  });
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const donorName = resolveDonorName(form);
    if (!donorName) {
      setError("Enter the donor name before saving.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required to create the donor profile.");
      return;
    }
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a monetary amount greater than zero.");
      return;
    }

    try {
      await onSave({
        ...form,
        amount,
        notes: form.notes?.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save the donation.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 pb-4 pt-6">
          <h2 className="text-lg font-black text-[#0e2118]">Add Monetary Donation</h2>
          <p className="mt-1 text-xs text-gray-500">Create a donor profile, then record the monetary gift in one step.</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Donor Details</h3>
              <select
                value={form.supporterType}
                onChange={(e) => setForm((current) => ({ ...current, supporterType: e.target.value as SupporterType }))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
              >
                <option value="individual">Individual</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {form.supporterType === "organization" ? (
                <input
                  value={form.organizationName}
                  onChange={(e) => setForm((current) => ({ ...current, organizationName: e.target.value }))}
                  placeholder="Organization name"
                  className={INPUT_CLASS}
                />
              ) : (
                <>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
                    placeholder="First name"
                    className={INPUT_CLASS}
                  />
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
                    placeholder="Last name"
                    className={INPUT_CLASS}
                  />
                </>
              )}
              <input
                value={form.displayName}
                onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))}
                placeholder="Display name"
                className={INPUT_CLASS}
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="Email"
                className={INPUT_CLASS}
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                placeholder="Phone"
                className={INPUT_CLASS}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Donation Details</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₱</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Amount"
                  className={`${INPUT_CLASS} pl-7`}
                />
              </div>
              <input
                type="date"
                value={form.donationDate}
                onChange={(e) => setForm((current) => ({ ...current, donationDate: e.target.value }))}
                className={INPUT_CLASS}
              />
              <select
                value={form.safehouseId ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, safehouseId: e.target.value ? Number(e.target.value) : null }))}
                className={SELECT_CLASS}
              >
                <option value="">General fund</option>
                {safehouses.map((safehouse) => (
                  <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                    {safehouse.safehouseName ?? `Safehouse #${safehouse.safehouseId}`}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((current) => ({ ...current, isRecurring: e.target.checked }))}
                />
                Recurring donation
              </label>
            </div>

            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              placeholder="Notes or receipt context..."
              className={TEXTAREA_CLASS}
            />
          </section>

          {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div> : null}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={pending}
            className="flex-1 rounded-xl bg-[#2a9d72] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#23856a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : "Create Donor + Donation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InKindDonationModal({
  safehouses,
  pending,
  onSave,
  onClose,
}: {
  safehouses: Safehouse[];
  pending: boolean;
  onSave: (payload: InKindEntryPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<InKindEntryPayload, "items">>({
    supporterType: "individual",
    displayName: "",
    firstName: "",
    lastName: "",
    organizationName: "",
    email: "",
    phone: "",
    notes: "",
    safehouseId: null,
  });
  const [items, setItems] = useState<InKindItemDraft[]>([blankItem()]);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<InKindItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  async function handleSubmit() {
    setError(null);
    const donorName = resolveDonorName(form);
    if (!donorName) {
      setError("Enter the donor name before saving.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required to create the donor profile.");
      return;
    }

    const normalizedItems = items
      .map((item) => {
        const quantity = Number(item.quantity);
        const estimatedUnitValue = item.estimatedUnitValue ? Number(item.estimatedUnitValue) : undefined;
        return {
          itemName: item.itemName.trim(),
          itemCategory: item.itemCategory.trim() || undefined,
          quantity,
          unitOfMeasure: item.unitOfMeasure.trim() || undefined,
          estimatedUnitValue: estimatedUnitValue && Number.isFinite(estimatedUnitValue) ? estimatedUnitValue : undefined,
          intendedUse: item.intendedUse.trim() || undefined,
          receivedCondition: item.receivedCondition.trim() || undefined,
        };
      })
      .filter((item) => item.itemName);

    if (normalizedItems.length === 0) {
      setError("Add at least one in-kind item.");
      return;
    }
    if (normalizedItems.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      setError("Each item needs a quantity greater than zero.");
      return;
    }

    try {
      await onSave({
        ...form,
        notes: form.notes?.trim() || undefined,
        items: normalizedItems,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save the in-kind donation.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 pb-4 pt-6">
          <h2 className="text-lg font-black text-[#0e2118]">Add In-Kind Donation</h2>
          <p className="mt-1 text-xs text-gray-500">Create the donor profile and record the donated items together.</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Donor Details</h3>
              <select
                value={form.supporterType}
                onChange={(e) => setForm((current) => ({ ...current, supporterType: e.target.value as SupporterType }))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
              >
                <option value="individual">Individual</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {form.supporterType === "organization" ? (
                <input
                  value={form.organizationName}
                  onChange={(e) => setForm((current) => ({ ...current, organizationName: e.target.value }))}
                  placeholder="Organization name"
                  className={INPUT_CLASS}
                />
              ) : (
                <>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
                    placeholder="First name"
                    className={INPUT_CLASS}
                  />
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
                    placeholder="Last name"
                    className={INPUT_CLASS}
                  />
                </>
              )}
              <input
                value={form.displayName}
                onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))}
                placeholder="Display name"
                className={INPUT_CLASS}
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="Email"
                className={INPUT_CLASS}
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                placeholder="Phone"
                className={INPUT_CLASS}
              />
              <select
                value={form.safehouseId ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, safehouseId: e.target.value ? Number(e.target.value) : null }))}
                className={SELECT_CLASS}
              >
                <option value="">General fund</option>
                {safehouses.map((safehouse) => (
                  <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                    {safehouse.safehouseName ?? `Safehouse #${safehouse.safehouseId}`}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              placeholder="Delivery notes, pickup context, or donor comments..."
              className={TEXTAREA_CLASS}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Items</h3>
              <button
                onClick={() => setItems((current) => [...current, blankItem()])}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-2xl border border-gray-100 bg-[#fbfcfb] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Item {index + 1}</div>
                    <button
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={item.itemName}
                      onChange={(e) => updateItem(index, { itemName: e.target.value })}
                      placeholder="Item name"
                      className={INPUT_CLASS}
                    />
                    <input
                      value={item.itemCategory}
                      onChange={(e) => updateItem(index, { itemCategory: e.target.value })}
                      placeholder="Category"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      placeholder="Quantity"
                      className={INPUT_CLASS}
                    />
                    <input
                      value={item.unitOfMeasure}
                      onChange={(e) => updateItem(index, { unitOfMeasure: e.target.value })}
                      placeholder="Unit of measure"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.estimatedUnitValue}
                      onChange={(e) => updateItem(index, { estimatedUnitValue: e.target.value })}
                      placeholder="Estimated unit value (PHP)"
                      className={INPUT_CLASS}
                    />
                    <input
                      value={item.receivedCondition}
                      onChange={(e) => updateItem(index, { receivedCondition: e.target.value })}
                      placeholder="Condition"
                      className={INPUT_CLASS}
                    />
                    <input
                      value={item.intendedUse}
                      onChange={(e) => updateItem(index, { intendedUse: e.target.value })}
                      placeholder="Intended use"
                      className="md:col-span-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div> : null}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={pending}
            className="flex-1 rounded-xl bg-[#0e2118] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1a3528] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : "Create In-Kind Donation"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function DonationsOverviewPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<RichDonation | null>(null);
  const [editingDonation, setEditingDonation] = useState<RichDonation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RichDonation | null>(null);
  const [entryModal, setEntryModal] = useState<"monetary" | "inKind" | null>(null);
  const [allocFilter, setAllocFilter] = useState<"all" | "unallocated" | "allocated">("all");
  const [fundType, setFundType] = useState<"all" | "general" | "directed">("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data: donationsData, isLoading } = useQuery({
    queryKey: ["admin-donations", fundType, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fundType !== "all") params.set("fundType", fundType);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const qs = params.toString();
      return apiFetch<{ data: RichDonation[]; total: number }>(`/api/donations?${qs}`, token ?? undefined);
    },
    enabled: !!token,
  });

  const { data: safehousesData } = useQuery({
    queryKey: ["safehouses-list"],
    queryFn: () => apiFetch<{ data: Safehouse[] }>("/api/safehouses", token ?? undefined),
    enabled: !!token,
  });

  const { data: statsData } = useQuery({
    queryKey: ["donation-stats", fundType],
    queryFn: () => {
      const qs = fundType !== "all" ? `?fundType=${fundType}` : "";
      return apiFetch<{ totalReceived: number; totalAllocated: number; pendingAllocationCount: number; uniqueDonors: number }>(`/api/donations/stats${qs}`, token ?? undefined);
    },
    enabled: !!token,
  });

  const allDonations = donationsData?.data ?? [];
  const totalRecords = donationsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safehouses = safehousesData?.data ?? [];

  const donations = allDonations.filter(d => {
    const matchSearch = !search
      || (d.supporterName ?? "").toLowerCase().includes(search.toLowerCase())
      || String(d.donationId).includes(search)
      || (d.campaignName ?? "").toLowerCase().includes(search.toLowerCase())
      || (d.safehouseName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchAlloc = allocFilter === "all"
      || (allocFilter === "unallocated" && (d.unallocated ?? 0) > 0.005)
      || (allocFilter === "allocated" && (d.unallocated ?? 0) <= 0.005);
    return matchSearch && matchAlloc;
  });

  const totalAmount = statsData?.totalReceived ?? 0;
  const totalAllocated = statsData?.totalAllocated ?? 0;
  const unallocatedCount = statsData?.pendingAllocationCount ?? 0;
  const uniqueDonors = statsData?.uniqueDonors ?? 0;

  const createMonetaryDonation = useMutation({
    mutationFn: async (payload: MonetaryEntryPayload) => {
      const donorName = resolveDonorName(payload);
      const supporter = await apiPost<CreatedSupporter>(
        "/api/supporters",
        {
          supporterType: payload.supporterType,
          displayName: donorName,
          firstName: payload.supporterType === "individual" ? payload.firstName || undefined : undefined,
          lastName: payload.supporterType === "individual" ? payload.lastName || undefined : undefined,
          organizationName: payload.supporterType === "organization" ? payload.organizationName || undefined : undefined,
          email: payload.email,
          phone: payload.phone || undefined,
          status: "active",
          acquisitionChannel: "manual_entry",
          firstDonationDate: payload.donationDate,
        },
        token ?? undefined,
      );
      const supporterId = extractSupporterId(supporter);
      if (!supporterId) {
        throw new Error("Unable to create the donor profile.");
      }

      return apiPost(
        "/api/donations",
        {
          supporterId,
          donationType: "monetary",
          donationDate: payload.donationDate,
          isRecurring: payload.isRecurring,
          channelSource: "manual_entry",
          currencyCode: "PHP",
          amount: payload.amount,
          notes: payload.notes,
          safehouseId: payload.safehouseId ?? undefined,
        },
        token ?? undefined,
      );
    },
    onSuccess: async () => {
      setPage(1);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-donations"] }),
        qc.invalidateQueries({ queryKey: ["donation-stats"] }),
        qc.invalidateQueries({ queryKey: ["supporters"] }),
        qc.invalidateQueries({ queryKey: ["donations"] }),
      ]);
    },
  });

  const createInKindDonation = useMutation({
    mutationFn: async (payload: InKindEntryPayload) => {
      const donorName = resolveDonorName(payload);
      const supporter = await apiPost<CreatedSupporter>(
        "/api/supporters",
        {
          supporterType: payload.supporterType,
          displayName: donorName,
          firstName: payload.supporterType === "individual" ? payload.firstName || undefined : undefined,
          lastName: payload.supporterType === "individual" ? payload.lastName || undefined : undefined,
          organizationName: payload.supporterType === "organization" ? payload.organizationName || undefined : undefined,
          email: payload.email,
          phone: payload.phone || undefined,
          status: "active",
          acquisitionChannel: "manual_entry",
        },
        token ?? undefined,
      );
      const supporterId = extractSupporterId(supporter);
      if (!supporterId) {
        throw new Error("Unable to create the donor profile.");
      }

      return apiPost("/api/donations/public/in-kind", {
        name: donorName,
        email: payload.email,
        notes: payload.notes,
        safehouseId: payload.safehouseId ?? undefined,
        supporterId,
        items: payload.items,
      });
    },
    onSuccess: async () => {
      setPage(1);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-donations"] }),
        qc.invalidateQueries({ queryKey: ["donation-stats"] }),
        qc.invalidateQueries({ queryKey: ["supporters"] }),
        qc.invalidateQueries({ queryKey: ["donations"] }),
      ]);
    },
  });

  const editDonation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiPatch(`/api/donations/${id}`, payload, token ?? undefined),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-donations"] }),
        qc.invalidateQueries({ queryKey: ["donation-stats"] }),
        qc.invalidateQueries({ queryKey: ["donations"] }),
      ]);
    },
  });

  const deleteDonation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/donations/${id}`, token ?? undefined),
    onSuccess: async (_data, id) => {
      if (selectedDonation?.donationId === id) setSelectedDonation(null);
      if (editingDonation?.donationId === id) setEditingDonation(null);
      setDeleteTarget(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-donations"] }),
        qc.invalidateQueries({ queryKey: ["donation-stats"] }),
        qc.invalidateQueries({ queryKey: ["donations"] }),
      ]);
    },
  });

  function fmtDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="p-6 space-y-6">
      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete donation?"
        description="This permanently deletes the donation record."
        isPending={deleteDonation.isPending}
        onConfirm={() => { if (deleteTarget) void deleteDonation.mutateAsync(deleteTarget.donationId); }}
        onCancel={() => setDeleteTarget(null)}
      />
      {selectedDonation && (
        <AllocateModal donation={selectedDonation} safehouses={safehouses} onClose={() => setSelectedDonation(null)} />
      )}
      {showCreate && <AdminDonationEntryModal mode="superadmin" onClose={() => setShowCreate(false)} />}
      {editingDonation ? (
        <EditDonationModal
          donation={editingDonation}
          safehouses={safehouses}
          pending={editDonation.isPending}
          onSave={async (id, payload) => {
            await editDonation.mutateAsync({ id, payload });
          }}
          onClose={() => setEditingDonation(null)}
        />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fundraising & Donations</h1>
          <p className="text-sm text-gray-500 mt-1">Allocate donated funds to safehouses and program areas</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#2a9d72] hover:bg-[#23856a]">
          <Plus className="w-4 h-4 mr-2" />
          Add Donation
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Total Received", value: `₱${totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`, color: "#2a9d72" },
          { icon: TrendingUp, label: "Total Allocated", value: `₱${totalAllocated.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`, color: "#457b9d" },
          { icon: AlertCircle, label: "Pending Allocation", value: String(unallocatedCount), color: "#f4a261" },
          { icon: Users, label: "Unique Donors", value: String(uniqueDonors), color: "#0e2118" },
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

      {/* Fund type tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: "all", label: "All Donations", Icon: DollarSign },
          { key: "general", label: "General Fund", Icon: Globe },
          { key: "directed", label: "Directed", Icon: Building2 },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => { setFundType(key); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${fundType === key ? "bg-white text-[#0e2118] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {fundType === "general" && (
        <div className="flex items-center gap-2 bg-[#f0faf6] border border-[#c8e6d4] text-[#2a9d72] text-sm rounded-xl px-4 py-3">
          <Globe className="w-4 h-4 shrink-0" />
          <span>General Fund donations have no designated safehouse. Allocate them to any safehouse and program area.</span>
        </div>
      )}
      {fundType === "directed" && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl px-4 py-3">
          <Building2 className="w-4 h-4 shrink-0" />
          <span>These donations were directed to a specific safehouse. The safehouse admin manages primary allocation; you may add supplemental entries here.</span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by donor, safehouse, ID, or campaign..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "unallocated", "allocated"] as const).map(f => (
            <button key={f} onClick={() => setAllocFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${allocFilter === f ? "bg-white text-[#0e2118] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {f === "unallocated" ? "Pending" : f === "allocated" ? "Allocated" : "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-7 h-7 animate-spin text-[#2a9d72]" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {donations.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No donations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Donor</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Destination</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[180px]">Allocation</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map(d => (
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
                        <span className="text-base font-black text-[#0e2118]">
                          ₱{((d.donationType === "in_kind" ? d.estimatedValue : d.amount) ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-xs text-gray-400">{d.currencyCode ?? "PHP"}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{fmtDate(d.donationDate)}</td>
                      <td className="px-5 py-4">
                        {d.isGeneralFund ? (
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            General Fund
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[#2a9d72] text-xs">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="font-medium">{d.safehouseName ?? `Safehouse #${d.safehouseId}`}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <AllocationStatus donation={d} />
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedDonation(d)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              (d.unallocated ?? 0) > 0.005 ? "bg-[#0e2118] text-white hover:bg-[#1a3528]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {(d.unallocated ?? 0) > 0.005 ? "Allocate" : "Review"}
                          </button>
                          <button
                            onClick={() => setEditingDonation(d)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(d)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalRecords > PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Showing {Math.min(page * PAGE_SIZE, totalRecords)} of {totalRecords} donations</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
