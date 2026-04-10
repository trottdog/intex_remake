import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiPost } from "@/services/api";

type Mode = "admin" | "superadmin";

interface SafehouseOption {
  safehouseId?: number | null;
  id?: number | null;
  safehouseName?: string | null;
  name?: string | null;
}

interface PriorSupporterOption {
  supporterId: number;
  displayName: string;
  email?: string | null;
  donationCount: number;
  lifetimeGiving: number;
}

interface Props {
  mode: Mode;
  onClose: () => void;
}

const SUPPORTER_TYPES = ["MonetaryDonor", "InKindDonor", "Volunteer", "SkillsContributor", "SocialMediaAdvocate", "PartnerOrganization"] as const;
const RELATIONSHIP_TYPES = ["Local", "International", "PartnerOrganization"] as const;
const SUPPORTER_STATUSES = ["Active", "Inactive"] as const;
const ACQUISITION_CHANNELS = ["Website", "SocialMedia", "Event", "WordOfMouth", "PartnerReferral", "Church"] as const;
const DONATION_TYPES = ["Monetary", "InKind", "Time", "Skills", "SocialMedia"] as const;
const CHANNEL_SOURCES = ["Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"] as const;
const IMPACT_UNITS = ["pesos", "items", "hours", "campaigns"] as const;
const ITEM_CATEGORIES = ["Food", "Supplies", "Clothing", "SchoolMaterials", "Hygiene", "Furniture", "Medical"] as const;
const UNIT_OF_MEASURES = ["pcs", "boxes", "kg", "sets", "packs"] as const;
const INTENDED_USES = ["Meals", "Education", "Shelter", "Hygiene", "Health"] as const;
const RECEIVED_CONDITIONS = ["New", "Good", "Fair"] as const;
const PROGRAM_AREAS = ["Education", "Wellbeing", "Operations", "Transport", "Maintenance", "Outreach"] as const;

function toDateTimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(dateTimeLocal: string): string | null {
  if (!dateTimeLocal) {
    return null;
  }

  return new Date(dateTimeLocal).toISOString();
}

function fmtCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function emptyInKindItem() {
  return {
    itemName: "",
    itemCategory: "",
    quantity: "1",
    unitOfMeasure: "pcs",
    estimatedUnitValue: "",
    intendedUse: "",
    receivedCondition: "",
  };
}

function emptyAllocation() {
  return {
    safehouseId: "",
    programArea: "",
    amountAllocated: "",
    allocationDate: new Date().toISOString().slice(0, 10),
    allocationNotes: "",
  };
}

export function AdminDonationEntryModal({ mode, onClose }: Props) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [supporterMode, setSupporterMode] = useState<"existing" | "new">("existing");
  const [supporterSearch, setSupporterSearch] = useState("");
  const [selectedSupporterId, setSelectedSupporterId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [supporterForm, setSupporterForm] = useState({
    supporterType: "MonetaryDonor",
    displayName: "",
    organizationName: "",
    firstName: "",
    lastName: "",
    relationshipType: "Local",
    region: "",
    country: "Philippines",
    email: "",
    phone: "",
    status: "Active",
    firstDonationDate: new Date().toISOString().slice(0, 10),
    acquisitionChannel: "Website",
    createdAt: toDateTimeLocalValue(new Date().toISOString()),
  });

  const [donationForm, setDonationForm] = useState({
    donationType: "Monetary",
    donationDate: new Date().toISOString().slice(0, 10),
    channelSource: "Direct",
    currencyCode: "PHP",
    amount: "",
    estimatedValue: "",
    impactUnit: "pesos",
    isRecurring: false,
    campaignName: "",
    notes: "",
    safehouseId: "",
  });

  const [inKindItems, setInKindItems] = useState([emptyInKindItem()]);
  const [allocations, setAllocations] = useState([emptyAllocation()]);

  const { data: safehousesData, isLoading: loadingSafehouses } = useQuery({
    queryKey: ["donation-entry-safehouses", mode],
    queryFn: () => apiFetch<{ data: SafehouseOption[] }>("/api/safehouses?limit=200", token ?? undefined),
    enabled: !!token,
  });

  const { data: priorSupportersData, isLoading: loadingPriorSupporters } = useQuery({
    queryKey: ["donation-prior-supporters", supporterSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (supporterSearch.trim()) {
        params.set("search", supporterSearch.trim());
      }
      params.set("limit", "20");
      return apiFetch<PriorSupporterOption[]>(`/api/donations/prior-supporters?${params.toString()}`, token ?? undefined);
    },
    enabled: !!token && supporterMode === "existing",
  });

  const safehouses = (safehousesData?.data ?? []).map((safehouse) => ({
    id: safehouse.safehouseId ?? safehouse.id ?? 0,
    label: safehouse.safehouseName ?? safehouse.name ?? `Safehouse #${safehouse.safehouseId ?? safehouse.id}`,
  })).filter((safehouse) => safehouse.id > 0);

  useEffect(() => {
    if (mode === "admin" && safehouses.length === 1 && !donationForm.safehouseId) {
      setDonationForm((current) => ({ ...current, safehouseId: String(safehouses[0].id) }));
      setAllocations((current) => current.map((item) => ({ ...item, safehouseId: String(safehouses[0].id) })));
    }
  }, [mode, safehouses, donationForm.safehouseId]);

  useEffect(() => {
    setSupporterForm((current) => ({ ...current, firstDonationDate: donationForm.donationDate }));
  }, [donationForm.donationDate]);

  const selectedSafehouseId = donationForm.safehouseId ? Number(donationForm.safehouseId) : null;
  const inKindEstimatedTotal = inKindItems.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity || "0");
    const estimatedUnitValue = parseFloat(item.estimatedUnitValue || "0");
    return sum + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(estimatedUnitValue) ? estimatedUnitValue : 0);
  }, 0);

  const createDonationMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      return apiPost("/api/donations/admin-entry", payload, token ?? undefined);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-safehouse-donations"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-donations"] }),
        queryClient.invalidateQueries({ queryKey: ["donation-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["supporters"] }),
      ]);
      onClose();
    },
    onError: (error: unknown) => {
      setFormError((error as { message?: string })?.message ?? "Failed to record donation.");
    },
  });

  function buildPayload() {
    const donationType = donationForm.donationType;
    const impactUnit = donationType === "Monetary"
      ? "pesos"
      : donationType === "InKind"
        ? "items"
        : donationForm.impactUnit;

    const payload: Record<string, unknown> = {
      existingSupporterId: supporterMode === "existing" ? selectedSupporterId : undefined,
      donationType,
      donationDate: donationForm.donationDate,
      channelSource: donationForm.channelSource,
      currencyCode: donationType === "Monetary" ? "PHP" : null,
      amount: donationType === "Monetary" ? parseFloat(donationForm.amount) : null,
      estimatedValue: donationType === "InKind"
        ? Number(inKindEstimatedTotal.toFixed(2))
        : donationType === "Monetary"
          ? parseFloat(donationForm.amount)
          : parseFloat(donationForm.estimatedValue),
      impactUnit,
      isRecurring: donationForm.isRecurring,
      campaignName: donationForm.campaignName || null,
      notes: donationForm.notes || null,
      safehouseId: donationForm.safehouseId ? Number(donationForm.safehouseId) : null,
      allocations: allocations.map((allocation) => ({
        safehouseId: selectedSafehouseId ?? (allocation.safehouseId ? Number(allocation.safehouseId) : null),
        programArea: allocation.programArea || null,
        amountAllocated: allocation.amountAllocated ? parseFloat(allocation.amountAllocated) : null,
        allocationDate: allocation.allocationDate || null,
        allocationNotes: allocation.allocationNotes || null,
      })),
    };

    if (supporterMode === "new") {
      payload.supporter = {
        supporterType: supporterForm.supporterType,
        displayName: supporterForm.displayName || null,
        organizationName: supporterForm.organizationName || null,
        firstName: supporterForm.firstName || null,
        lastName: supporterForm.lastName || null,
        relationshipType: supporterForm.relationshipType || null,
        region: supporterForm.region || null,
        country: supporterForm.country || null,
        email: supporterForm.email || null,
        phone: supporterForm.phone || null,
        status: supporterForm.status || null,
        firstDonationDate: supporterForm.firstDonationDate || null,
        acquisitionChannel: supporterForm.acquisitionChannel || null,
        createdAt: toIsoString(supporterForm.createdAt),
      };
    }

    if (donationType === "InKind") {
      payload.inKindItems = inKindItems.map((item) => ({
        itemName: item.itemName || null,
        itemCategory: item.itemCategory || null,
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        unitOfMeasure: item.unitOfMeasure || null,
        estimatedUnitValue: item.estimatedUnitValue ? parseFloat(item.estimatedUnitValue) : null,
        intendedUse: item.intendedUse || null,
        receivedCondition: item.receivedCondition || null,
      }));
    }

    return payload;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (supporterMode === "existing" && !selectedSupporterId) {
      setFormError("Please select an existing donor or switch to New Supporter.");
      return;
    }

    if (mode === "admin" && !donationForm.safehouseId) {
      setFormError("Please select the safehouse receiving this donation.");
      return;
    }

    if (!donationForm.amount && donationForm.donationType === "Monetary") {
      setFormError("Please enter the donation amount.");
      return;
    }

    if (donationForm.donationType !== "Monetary" && donationForm.donationType !== "InKind" && !donationForm.estimatedValue) {
      setFormError("Please enter the estimated donation value.");
      return;
    }

    if (allocations.length === 0) {
      setFormError("At least one allocation is required.");
      return;
    }

    createDonationMutation.mutate();
  }

  const fieldClassName = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white";
  const labelClassName = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-[#0e2118] px-6 pt-5 pb-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4 text-[#2a9d72]" />
            <span className="text-[#2a9d72] text-xs font-semibold uppercase tracking-wide">New Donation Entry</span>
          </div>
          <h2 className="text-lg font-bold text-white">Record Donation</h2>
          <p className="text-sm text-white/60 mt-1">
            {mode === "admin"
              ? "Create a donation for your safehouse and allocate it immediately."
              : "Create a donation for any safehouse or the general fund and allocate it immediately."}
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0e2118]">Supporter</h3>
                <p className="text-xs text-gray-400">Link this donation to an existing donor or create a new supporter record.</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {(["existing", "new"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSupporterMode(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${supporterMode === value ? "bg-white text-[#0e2118] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {value === "existing" ? "Existing Donor" : "New Supporter"}
                  </button>
                ))}
              </div>
            </div>

            {supporterMode === "existing" ? (
              <div className="rounded-2xl border border-gray-100 bg-[#f8faf9] p-4 space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={supporterSearch}
                    onChange={(event) => setSupporterSearch(event.target.value)}
                    placeholder="Search prior donors by name or email..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {loadingPriorSupporters ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading prior donors...
                    </div>
                  ) : (priorSupportersData ?? []).length > 0 ? (
                    (priorSupportersData ?? []).map((supporter) => {
                      const isSelected = selectedSupporterId === supporter.supporterId;
                      return (
                        <button
                          key={supporter.supporterId}
                          type="button"
                          onClick={() => setSelectedSupporterId(supporter.supporterId)}
                          className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${isSelected ? "border-[#2a9d72] bg-[#eef8f3]" : "border-gray-200 bg-white hover:border-[#b9decf]"}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#0e2118]">{supporter.displayName}</div>
                              <div className="text-xs text-gray-400">{supporter.email || "No email on record"}</div>
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <div>{supporter.donationCount} donations</div>
                              <div className="font-semibold text-[#2a9d72]">{fmtCurrency(supporter.lifetimeGiving)}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-400 py-2">No prior donors matched your search.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-[#f8faf9] p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Supporter Type</label>
                    <select className={fieldClassName} value={supporterForm.supporterType} onChange={(event) => setSupporterForm((current) => ({ ...current, supporterType: event.target.value }))}>
                      {SUPPORTER_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Display Name</label>
                    <input className={fieldClassName} value={supporterForm.displayName} onChange={(event) => setSupporterForm((current) => ({ ...current, displayName: event.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Organization Name</label>
                    <input className={fieldClassName} value={supporterForm.organizationName} onChange={(event) => setSupporterForm((current) => ({ ...current, organizationName: event.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClassName}>Relationship Type</label>
                    <select className={fieldClassName} value={supporterForm.relationshipType} onChange={(event) => setSupporterForm((current) => ({ ...current, relationshipType: event.target.value }))}>
                      {RELATIONSHIP_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>First Name</label>
                    <input className={fieldClassName} value={supporterForm.firstName} onChange={(event) => setSupporterForm((current) => ({ ...current, firstName: event.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClassName}>Last Name</label>
                    <input className={fieldClassName} value={supporterForm.lastName} onChange={(event) => setSupporterForm((current) => ({ ...current, lastName: event.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Region</label>
                    <input className={fieldClassName} value={supporterForm.region} onChange={(event) => setSupporterForm((current) => ({ ...current, region: event.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClassName}>Country</label>
                    <input className={fieldClassName} value={supporterForm.country} onChange={(event) => setSupporterForm((current) => ({ ...current, country: event.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Email</label>
                    <input type="email" className={fieldClassName} value={supporterForm.email} onChange={(event) => setSupporterForm((current) => ({ ...current, email: event.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClassName}>Phone</label>
                    <input className={fieldClassName} value={supporterForm.phone} onChange={(event) => setSupporterForm((current) => ({ ...current, phone: event.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Status</label>
                    <select className={fieldClassName} value={supporterForm.status} onChange={(event) => setSupporterForm((current) => ({ ...current, status: event.target.value }))}>
                      {SUPPORTER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Acquisition Channel</label>
                    <select className={fieldClassName} value={supporterForm.acquisitionChannel} onChange={(event) => setSupporterForm((current) => ({ ...current, acquisitionChannel: event.target.value }))}>
                      {ACQUISITION_CHANNELS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>First Donation Date</label>
                    <input type="date" className={fieldClassName} value={supporterForm.firstDonationDate} onChange={(event) => setSupporterForm((current) => ({ ...current, firstDonationDate: event.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClassName}>Created At</label>
                    <input type="datetime-local" className={fieldClassName} value={supporterForm.createdAt} onChange={(event) => setSupporterForm((current) => ({ ...current, createdAt: event.target.value }))} />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#0e2118]">Donation Details</h3>
              <p className="text-xs text-gray-400">These fields create the donation record itself.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Donation Type</label>
                <select
                  className={fieldClassName}
                  value={donationForm.donationType}
                  onChange={(event) => setDonationForm((current) => ({
                    ...current,
                    donationType: event.target.value,
                    currencyCode: event.target.value === "Monetary" ? "PHP" : "",
                    impactUnit: event.target.value === "Monetary"
                      ? "pesos"
                      : event.target.value === "InKind"
                        ? "items"
                        : current.impactUnit,
                  }))}
                >
                  {DONATION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Donation Date</label>
                <input type="date" className={fieldClassName} value={donationForm.donationDate} onChange={(event) => setDonationForm((current) => ({ ...current, donationDate: event.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Channel Source</label>
                <select className={fieldClassName} value={donationForm.channelSource} onChange={(event) => setDonationForm((current) => ({ ...current, channelSource: event.target.value }))}>
                  {CHANNEL_SOURCES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Safehouse Destination</label>
                {loadingSafehouses ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading safehouses...
                  </div>
                ) : (
                  <select className={fieldClassName} value={donationForm.safehouseId} onChange={(event) => setDonationForm((current) => ({ ...current, safehouseId: event.target.value }))}>
                    {mode === "superadmin" && <option value="">General Fund</option>}
                    {safehouses.map((safehouse) => <option key={safehouse.id} value={safehouse.id}>{safehouse.label}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {donationForm.donationType === "Monetary" ? (
                <div>
                  <label className={labelClassName}>Amount (PHP)</label>
                  <input type="number" min="0" step="0.01" className={fieldClassName} value={donationForm.amount} onChange={(event) => setDonationForm((current) => ({ ...current, amount: event.target.value }))} />
                </div>
              ) : donationForm.donationType === "InKind" ? (
                <div>
                  <label className={labelClassName}>Estimated Value (computed)</label>
                  <div className="h-10 px-3 rounded-xl border border-[#d9eee4] bg-[#f5fbf8] text-sm flex items-center font-semibold text-[#0e6641]">
                    {fmtCurrency(inKindEstimatedTotal)}
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelClassName}>Estimated Value (PHP)</label>
                  <input type="number" min="0" step="0.01" className={fieldClassName} value={donationForm.estimatedValue} onChange={(event) => setDonationForm((current) => ({ ...current, estimatedValue: event.target.value }))} />
                </div>
              )}
              <div>
                <label className={labelClassName}>Impact Unit</label>
                <select
                  className={fieldClassName}
                  value={donationForm.donationType === "Monetary" ? "pesos" : donationForm.donationType === "InKind" ? "items" : donationForm.impactUnit}
                  onChange={(event) => setDonationForm((current) => ({ ...current, impactUnit: event.target.value }))}
                  disabled={donationForm.donationType === "Monetary" || donationForm.donationType === "InKind"}
                >
                  {IMPACT_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Campaign Name</label>
                <input className={fieldClassName} value={donationForm.campaignName} onChange={(event) => setDonationForm((current) => ({ ...current, campaignName: event.target.value }))} />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#0e2118]">
                  <input type="checkbox" checked={donationForm.isRecurring} onChange={(event) => setDonationForm((current) => ({ ...current, isRecurring: event.target.checked }))} />
                  Recurring Donation
                </label>
              </div>
            </div>
            <div>
              <label className={labelClassName}>Notes</label>
              <textarea className={`${fieldClassName} min-h-24`} value={donationForm.notes} onChange={(event) => setDonationForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
          </section>

          {donationForm.donationType === "InKind" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0e2118]">In-Kind Items</h3>
                  <p className="text-xs text-gray-400">Line items populate the in-kind donation items table.</p>
                </div>
                <Button type="button" onClick={() => setInKindItems((current) => [...current, emptyInKindItem()])} className="bg-[#2a9d72] hover:bg-[#23856a]">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {inKindItems.map((item, index) => (
                  <div key={`inkind-${index}`} className="rounded-2xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[#0e2118]">Item #{index + 1}</div>
                      {inKindItems.length > 1 && (
                        <button type="button" onClick={() => setInKindItems((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>Item Name</label>
                        <input className={fieldClassName} value={item.itemName} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, itemName: event.target.value } : entry))} />
                      </div>
                      <div>
                        <label className={labelClassName}>Category</label>
                        <select className={fieldClassName} value={item.itemCategory} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, itemCategory: event.target.value } : entry))}>
                          <option value="">Select...</option>
                          {ITEM_CATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClassName}>Quantity</label>
                        <input type="number" min="0" step="1" className={fieldClassName} value={item.quantity} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, quantity: event.target.value } : entry))} />
                      </div>
                      <div>
                        <label className={labelClassName}>Unit</label>
                        <select className={fieldClassName} value={item.unitOfMeasure} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, unitOfMeasure: event.target.value } : entry))}>
                          {UNIT_OF_MEASURES.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClassName}>Unit Value (PHP)</label>
                        <input type="number" min="0" step="0.01" className={fieldClassName} value={item.estimatedUnitValue} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, estimatedUnitValue: event.target.value } : entry))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>Intended Use</label>
                        <select className={fieldClassName} value={item.intendedUse} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, intendedUse: event.target.value } : entry))}>
                          <option value="">Select...</option>
                          {INTENDED_USES.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClassName}>Received Condition</label>
                        <select className={fieldClassName} value={item.receivedCondition} onChange={(event) => setInKindItems((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, receivedCondition: event.target.value } : entry))}>
                          <option value="">Select...</option>
                          {RECEIVED_CONDITIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0e2118]">Allocations</h3>
                <p className="text-xs text-gray-400">Each row creates a donation allocation record.</p>
              </div>
              <Button type="button" onClick={() => setAllocations((current) => [...current, emptyAllocation()])} className="bg-[#2a9d72] hover:bg-[#23856a]">
                <Plus className="w-4 h-4 mr-1" /> Add Allocation
              </Button>
            </div>
            <div className="space-y-3">
              {allocations.map((allocation, index) => (
                <div key={`allocation-${index}`} className="rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#0e2118]">Allocation #{index + 1}</div>
                    {allocations.length > 1 && (
                      <button type="button" onClick={() => setAllocations((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedSafehouseId ? (
                      <div className="rounded-xl border border-[#d9eee4] bg-[#f5fbf8] px-3 py-2 text-sm text-[#245844] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#2a9d72]" />
                        {safehouses.find((safehouse) => safehouse.id === selectedSafehouseId)?.label ?? `Safehouse #${selectedSafehouseId}`}
                      </div>
                    ) : (
                      <div>
                        <label className={labelClassName}>Safehouse</label>
                        <select className={fieldClassName} value={allocation.safehouseId} onChange={(event) => setAllocations((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, safehouseId: event.target.value } : entry))}>
                          <option value="">Select safehouse...</option>
                          {safehouses.map((safehouse) => <option key={safehouse.id} value={safehouse.id}>{safehouse.label}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={labelClassName}>Program Area</label>
                      <select className={fieldClassName} value={allocation.programArea} onChange={(event) => setAllocations((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, programArea: event.target.value } : entry))}>
                        <option value="">Select...</option>
                        {PROGRAM_AREAS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Amount Allocated (PHP)</label>
                      <input type="number" min="0" step="0.01" className={fieldClassName} value={allocation.amountAllocated} onChange={(event) => setAllocations((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, amountAllocated: event.target.value } : entry))} />
                    </div>
                    <div>
                      <label className={labelClassName}>Allocation Date</label>
                      <input type="date" className={fieldClassName} value={allocation.allocationDate} onChange={(event) => setAllocations((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, allocationDate: event.target.value } : entry))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName}>Allocation Notes</label>
                    <input className={fieldClassName} value={allocation.allocationNotes} onChange={(event) => setAllocations((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, allocationNotes: event.target.value } : entry))} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createDonationMutation.isPending} className="bg-[#2a9d72] hover:bg-[#23856a]">
            {createDonationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Save Donation
          </Button>
        </div>
      </form>
    </div>
  );
}
