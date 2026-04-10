import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiDelete } from "@/services/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { AdminDonationEntryModal } from "@/components/donations/AdminDonationEntryModal";
import {
  DollarSign, TrendingUp, Users, Search, Layers,
  X, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, RefreshCw,
  Globe, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PROGRAM_AREAS = ["Outreach", "Education", "Wellbeing", "Maintenance", "Operations", "Transport"];

interface RichDonation {
  donationId: number;
  supporterId: number | null;
  supporterName: string | null;
  amount: number | null;
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!deleteTarget ? onClose : undefined} />
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

const PAGE_SIZE = 20;

export default function DonationsOverviewPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<RichDonation | null>(null);
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

  function fmtDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="p-6 space-y-6">
      {selectedDonation && (
        <AllocateModal donation={selectedDonation} safehouses={safehouses} onClose={() => setSelectedDonation(null)} />
      )}
      {showCreate && <AdminDonationEntryModal mode="superadmin" onClose={() => setShowCreate(false)} />}

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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
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
                        <span className="text-base font-black text-[#0e2118]">₱{(d.amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
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
                        <button
                          onClick={() => setSelectedDonation(d)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            (d.unallocated ?? 0) > 0.005 ? "bg-[#0e2118] text-white hover:bg-[#1a3528]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          {(d.unallocated ?? 0) > 0.005 ? "Allocate" : "Review"}
                        </button>
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
