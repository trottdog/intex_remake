import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Handshake, CheckCircle, XCircle, MapPin, Search, Plus,
  Pencil, Trash2, X, Mail, Phone, Users, Star, Calendar,
  ClipboardList, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Partner {
  partnerId: number;
  partnerName: string | null;
  partnerType: string | null;
  roleType: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

interface Assignment {
  assignmentId: number;
  partnerId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  responsibilityNotes: string | null;
  isPrimary: boolean | null;
  status: string | null;
  safehouseName: string | null;
}

interface Safehouse { safehouseId: number; safehouseName: string | null; }

// ── Config ────────────────────────────────────────────────────────────────────
const PARTNER_TYPES = [
  "Government Agency", "NGO / Non-Profit", "Religious Organization",
  "Academic Institution", "Healthcare Provider", "Legal Services",
  "Social Services", "International Organization", "Corporate / Private Sector", "Other",
];
const ROLE_TYPES = [
  "Referral", "Legal Support", "Medical Support", "Psychosocial Support",
  "Skills Training", "Livelihood Assistance", "Financial Assistance",
  "Safe Housing", "Monitoring & Evaluation", "Advocacy", "Capacity Building", "Other",
];

const PARTNER_STATUS: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  active:   { label: "Active",   icon: CheckCircle, cls: "bg-[#e6f4ee] text-[#0e6641] border border-[#b3deca]" },
  inactive: { label: "Inactive", icon: XCircle,     cls: "bg-gray-100 text-gray-500 border border-gray-200" },
  pending:  { label: "Pending",  icon: Users,       cls: "bg-amber-50 text-amber-700 border border-amber-200" },
};

const ASSIGN_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-[#e6f4ee] text-[#0e6641] border border-[#b3deca]" },
  inactive:  { label: "Inactive",  cls: "bg-gray-100 text-gray-500 border border-gray-200" },
  completed: { label: "Completed", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
};

// ── Form State Types ──────────────────────────────────────────────────────────
type PartnerForm = {
  partnerName: string; partnerType: string; roleType: string;
  contactName: string; email: string; phone: string; region: string;
  status: string; startDate: string; endDate: string; notes: string;
};

const EMPTY_PARTNER: PartnerForm = {
  partnerName: "", partnerType: "", roleType: "", contactName: "",
  email: "", phone: "", region: "", status: "active",
  startDate: "", endDate: "", notes: "",
};

type AssignmentForm = {
  safehouseId: number | null; programArea: string;
  assignmentStart: string; assignmentEnd: string;
  responsibilityNotes: string; isPrimary: boolean; status: string;
};

const EMPTY_ASSIGNMENT: AssignmentForm = {
  safehouseId: null, programArea: "", assignmentStart: "",
  assignmentEnd: "", responsibilityNotes: "", isPrimary: false, status: "active",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function PartnerAvatar({ name }: { name: string | null }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-9 h-9 rounded-lg bg-[#0e2118] flex items-center justify-center shrink-0">
      <span className="text-[#7bc5a6] text-xs font-bold">{initials}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display = value == null || value === "" ? null : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-snug whitespace-pre-line">
        {display ?? <span className="text-gray-300 italic">—</span>}
      </p>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminPartnersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { page, setPage } = useQueryPagination();
  const [search, setSearch] = useState("");

  // Partner CRUD state
  const [viewTarget, setViewTarget] = useState<Partner | null>(null);
  const [detailTab, setDetailTab] = useState<"details" | "assignments">("details");
  const [partnerPanelOpen, setPartnerPanelOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(EMPTY_PARTNER);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [partnerFormError, setPartnerFormError] = useState("");

  // Assignment CRUD state
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);
  const [editingAssign, setEditingAssign] = useState<Assignment | null>(null);
  const [assignForm, setAssignForm] = useState<AssignmentForm>(EMPTY_ASSIGNMENT);
  const [deleteAssign, setDeleteAssign] = useState<Assignment | null>(null);
  const [assignFormError, setAssignFormError] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: partnersData, isLoading } = useQuery({
    queryKey: ["partners", page],
    queryFn: () => apiFetch<{ data: Partner[]; total: number; pagination: { totalPages: number } }>(
      `/api/partners?page=${page}&limit=20`, token ?? undefined),
    enabled: !!token,
  });

  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ["partner-assignments", viewTarget?.partnerId],
    queryFn: () => apiFetch<{ data: Assignment[] }>(
      `/api/partner-assignments?partnerId=${viewTarget!.partnerId}`, token ?? undefined),
    enabled: !!token && !!viewTarget,
  });

  const { data: safehousesData } = useQuery({
    queryKey: ["safehouses-for-assign"],
    queryFn: () => apiFetch<{ data: Safehouse[] }>("/api/safehouses?limit=100", token ?? undefined),
    enabled: !!token,
  });

  const allPartners = partnersData?.data ?? [];
  const safehouses: Safehouse[] = safehousesData?.data ?? [];
  const assignments: Assignment[] = assignmentsData?.data ?? [];
  const totalPages = partnersData?.pagination?.totalPages ?? 1;

  const partners = allPartners.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.partnerName?.toLowerCase().includes(q) || p.partnerType?.toLowerCase().includes(q) ||
      p.roleType?.toLowerCase().includes(q) || p.contactName?.toLowerCase().includes(q) ||
      p.region?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  });

  const active = allPartners.filter(p => p.status === "active").length;
  const regions = new Set(allPartners.map(p => p.region).filter(Boolean)).size;

  // ── Partner mutations ──────────────────────────────────────────────────────
  const createPartnerM = useMutation({
    mutationFn: (body: object) => apiPost<Partner>("/api/partners", body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partners"] }); closePartnerPanel(); },
    onError: () => setPartnerFormError("Failed to save."),
  });
  const updatePartnerM = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiPatch<Partner>(`/api/partners/${id}`, body, token ?? undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partners"] }); closePartnerPanel(); },
    onError: () => setPartnerFormError("Failed to update."),
  });
  const deletePartnerM = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/partners/${id}`, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setDeleteTarget(null); setViewTarget(null);
    },
  });

  function openCreatePartner() {
    setEditingPartner(null); setPartnerForm(EMPTY_PARTNER); setPartnerFormError(""); setPartnerPanelOpen(true);
  }
  function openEditPartner(p: Partner) {
    setEditingPartner(p);
    setPartnerForm({
      partnerName: p.partnerName ?? "", partnerType: p.partnerType ?? "", roleType: p.roleType ?? "",
      contactName: p.contactName ?? "", email: p.email ?? "", phone: p.phone ?? "",
      region: p.region ?? "", status: p.status ?? "active",
      startDate: p.startDate ?? "", endDate: p.endDate ?? "", notes: p.notes ?? "",
    });
    setPartnerFormError(""); setPartnerPanelOpen(true);
  }
  function closePartnerPanel() { setPartnerPanelOpen(false); setEditingPartner(null); setPartnerFormError(""); }
  function setPF<K extends keyof PartnerForm>(k: K, v: PartnerForm[K]) { setPartnerForm(p => ({ ...p, [k]: v })); }

  function submitPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerForm.partnerName.trim()) { setPartnerFormError("Partner name is required."); return; }
    const payload = {
      partnerName: partnerForm.partnerName || null, partnerType: partnerForm.partnerType || null,
      roleType: partnerForm.roleType || null, contactName: partnerForm.contactName || null,
      email: partnerForm.email || null, phone: partnerForm.phone || null,
      region: partnerForm.region || null, status: partnerForm.status || null,
      startDate: partnerForm.startDate || null, endDate: partnerForm.endDate || null,
      notes: partnerForm.notes || null,
    };
    if (editingPartner) updatePartnerM.mutate({ id: editingPartner.partnerId, body: payload });
    else createPartnerM.mutate(payload);
  }

  // ── Assignment mutations ───────────────────────────────────────────────────
  const createAssignM = useMutation({
    mutationFn: (body: object) => apiPost<Assignment>("/api/partner-assignments", body, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-assignments", viewTarget?.partnerId] });
      closeAssignPanel();
    },
    onError: () => setAssignFormError("Failed to save assignment."),
  });
  const updateAssignM = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiPatch<Assignment>(`/api/partner-assignments/${id}`, body, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-assignments", viewTarget?.partnerId] });
      closeAssignPanel();
    },
    onError: () => setAssignFormError("Failed to update assignment."),
  });
  const deleteAssignM = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/partner-assignments/${id}`, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-assignments", viewTarget?.partnerId] });
      setDeleteAssign(null);
    },
  });

  function openCreateAssign() {
    setEditingAssign(null); setAssignForm(EMPTY_ASSIGNMENT); setAssignFormError(""); setAssignPanelOpen(true);
  }
  function openEditAssign(a: Assignment) {
    setEditingAssign(a);
    setAssignForm({
      safehouseId: a.safehouseId, programArea: a.programArea ?? "",
      assignmentStart: a.assignmentStart ?? "", assignmentEnd: a.assignmentEnd ?? "",
      responsibilityNotes: a.responsibilityNotes ?? "",
      isPrimary: a.isPrimary ?? false, status: a.status ?? "active",
    });
    setAssignFormError(""); setAssignPanelOpen(true);
  }
  function closeAssignPanel() { setAssignPanelOpen(false); setEditingAssign(null); setAssignFormError(""); }
  function setAF<K extends keyof AssignmentForm>(k: K, v: AssignmentForm[K]) { setAssignForm(p => ({ ...p, [k]: v })); }

  function submitAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignForm.programArea.trim()) { setAssignFormError("Program area is required."); return; }
    const payload = {
      partnerId: viewTarget!.partnerId,
      safehouseId: assignForm.safehouseId ?? null,
      programArea: assignForm.programArea || null,
      assignmentStart: assignForm.assignmentStart || null,
      assignmentEnd: assignForm.assignmentEnd || null,
      responsibilityNotes: assignForm.responsibilityNotes || null,
      isPrimary: assignForm.isPrimary,
      status: assignForm.status || null,
    };
    if (editingAssign) updateAssignM.mutate({ id: editingAssign.assignmentId, body: payload });
    else createAssignM.mutate(payload);
  }

  const isSavingPartner = createPartnerM.isPending || updatePartnerM.isPending;
  const isSavingAssign = createAssignM.isPending || updateAssignM.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">External agencies and service providers supporting the safehouse network</p>
        </div>
        <Button onClick={openCreatePartner} className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-2">
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Partners",  value: allPartners.length, color: "text-gray-900" },
          { label: "Active Partners", value: active,             color: "text-[#2a9d72]" },
          { label: "Regions Covered", value: regions,            color: "text-blue-600" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{isLoading ? "—" : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search name, type, region, contact..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Partners Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type / Role</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Since</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <Handshake className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">{search ? "No partners match your search" : "No partners on record"}</p>
                  {!search && <p className="text-xs mt-1">Use "Add Partner" to register a partner organization</p>}
                </td>
              </tr>
            ) : partners.map(p => {
              const st = PARTNER_STATUS[p.status ?? ""] ?? { label: p.status ?? "—", icon: Users, cls: "bg-gray-100 text-gray-500 border border-gray-200" };
              const StatusIcon = st.icon;
              return (
                <tr key={p.partnerId}
                  onClick={() => { setViewTarget(p); setDetailTab("details"); }}
                  className="hover:bg-[#f0faf5] transition-colors group cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <PartnerAvatar name={p.partnerName} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{p.partnerName ?? "—"}</p>
                        {p.contactName && <p className="text-xs text-gray-400">{p.contactName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      {p.partnerType && <span className="inline-block text-xs bg-[#0e2118]/8 text-[#0e2118] px-2 py-0.5 rounded-full font-medium">{p.partnerType}</span>}
                      {p.roleType && <p className="text-[11px] text-gray-400">{p.roleType}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      {p.email && <div className="flex items-center gap-1 text-xs text-gray-600"><Mail className="w-3 h-3 shrink-0" /><span className="truncate max-w-[140px]">{p.email}</span></div>}
                      {p.phone && <div className="flex items-center gap-1 text-xs text-gray-600"><Phone className="w-3 h-3 shrink-0" /><span>{p.phone}</span></div>}
                      {!p.email && !p.phone && <span className="text-gray-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.region ? <div className="flex items-center gap-1 text-xs text-gray-600"><MapPin className="w-3 h-3 text-gray-400 shrink-0" />{p.region}</div>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.cls}`}>
                      <StatusIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{fmtDate(p.startDate) ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={e => { e.stopPropagation(); openEditPartner(p); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{partnersData?.total ?? 0} total partners</span>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Slide-over (two tabs) ─────────────────────────────────────── */}
      {viewTarget && !partnerPanelOpen && !assignPanelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setViewTarget(null)} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Slide-over header */}
            <div className="px-6 py-4 bg-[#0e2118]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Handshake className="w-5 h-5 text-[#7bc5a6]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{viewTarget.partnerName ?? "Partner"}</h2>
                    <p className="text-xs text-[#7bc5a6] mt-0.5">{viewTarget.partnerType ?? "Partner Organization"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setViewTarget(null); openEditPartner(viewTarget); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setViewTarget(null); setDeleteTarget(viewTarget); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button onClick={() => setViewTarget(null)} className="ml-1 text-gray-300 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {(["details", "assignments"] as const).map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      detailTab === tab ? "bg-white/20 text-white" : "text-[#7bc5a6] hover:bg-white/10"
                    }`}>
                    {tab === "details" ? "Partner Details" : "Assignments"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {detailTab === "details" ? (
                <div className="px-6 py-5 space-y-6">
                  {(() => {
                    const st = PARTNER_STATUS[viewTarget.status ?? ""] ?? { label: viewTarget.status ?? "—", icon: Users, cls: "bg-gray-100 text-gray-500 border border-gray-200" };
                    const StatusIcon = st.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                        <StatusIcon className="w-3.5 h-3.5" /> {st.label}
                      </span>
                    );
                  })()}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Organization</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Partner Name" value={viewTarget.partnerName} />
                      <DetailField label="Partner Type" value={viewTarget.partnerType} />
                      <DetailField label="Role / Function" value={viewTarget.roleType} />
                      <DetailField label="Region" value={viewTarget.region} />
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Contact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Contact Person" value={viewTarget.contactName} />
                      <DetailField label="Phone" value={viewTarget.phone} />
                      <div className="col-span-2"><DetailField label="Email" value={viewTarget.email} /></div>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Partnership Dates</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Start Date" value={fmtDate(viewTarget.startDate)} />
                      <DetailField label="End Date" value={fmtDate(viewTarget.endDate)} />
                    </div>
                  </section>
                  {viewTarget.notes && (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Notes</h3>
                      <p className="text-sm text-gray-800 leading-relaxed">{viewTarget.notes}</p>
                    </section>
                  )}
                </div>
              ) : (
                /* ── Assignments Tab ── */
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">
                      {loadingAssignments ? "Loading..." : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`}
                    </p>
                    <Button onClick={openCreateAssign} size="sm" className="bg-[#2a9d72] hover:bg-[#238c63] text-white gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" /> Add Assignment
                    </Button>
                  </div>

                  {loadingAssignments ? (
                    Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))
                  ) : assignments.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No assignments yet</p>
                      <p className="text-xs mt-1">Use "Add Assignment" to link this partner to a safehouse program</p>
                    </div>
                  ) : assignments.map(a => {
                    const ast = ASSIGN_STATUS[a.status ?? ""] ?? { label: a.status ?? "—", cls: "bg-gray-100 text-gray-500 border border-gray-200" };
                    return (
                      <div key={a.assignmentId} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {a.safehouseName && (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-sm font-semibold text-gray-800 truncate">{a.safehouseName}</span>
                              </div>
                            )}
                            {a.isPrimary && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                                <Star className="w-2.5 h-2.5" /> Primary
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ast.cls}`}>{ast.label}</span>
                            <button onClick={() => openEditAssign(a)} className="p-1 rounded hover:bg-blue-50 text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteAssign(a)} className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        {a.programArea && (
                          <p className="text-xs font-semibold text-[#2a9d72] bg-[#f0faf5] px-2 py-0.5 rounded-full inline-block">{a.programArea}</p>
                        )}
                        {(a.assignmentStart || a.assignmentEnd) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{fmtDate(a.assignmentStart) ?? "Open"} — {fmtDate(a.assignmentEnd) ?? "Ongoing"}</span>
                          </div>
                        )}
                        {a.responsibilityNotes && (
                          <p className="text-xs text-gray-500 leading-relaxed">{a.responsibilityNotes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Partner Create / Edit Panel ─────────────────────────────────────── */}
      {partnerPanelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePartnerPanel} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0e2118]">
              <div>
                <h2 className="text-base font-bold text-white">{editingPartner ? "Edit Partner" : "Add Partner Organization"}</h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">{editingPartner ? "Update partner record" : "Register a new partner to the network"}</p>
              </div>
              <button onClick={closePartnerPanel} className="text-gray-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitPartner} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Organization Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Partner Name <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerForm.partnerName} onChange={e => setPF("partnerName", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Organization name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Partner Type</label>
                      <select value={partnerForm.partnerType} onChange={e => setPF("partnerType", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="">— Select —</option>
                        {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                      <select value={partnerForm.status} onChange={e => setPF("status", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role / Function</label>
                    <select value={partnerForm.roleType} onChange={e => setPF("roleType", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                      <option value="">— Select Role —</option>
                      {ROLE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                      <input type="text" value={partnerForm.contactName} onChange={e => setPF("contactName", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                      <input type="tel" value={partnerForm.phone} onChange={e => setPF("phone", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="+63 9XX XXX XXXX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" value={partnerForm.email} onChange={e => setPF("email", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="contact@organization.org" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Region</label>
                    <input type="text" value={partnerForm.region} onChange={e => setPF("region", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" placeholder="e.g. NCR, Region IV-A" />
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Partnership Dates</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                    <input type="date" value={partnerForm.startDate} onChange={e => setPF("startDate", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                    <input type="date" value={partnerForm.endDate} onChange={e => setPF("endDate", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Notes</h3>
                <textarea rows={3} value={partnerForm.notes} onChange={e => setPF("notes", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                  placeholder="Any additional context about this partnership..." />
              </section>
              {partnerFormError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{partnerFormError}</p>}
            </form>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={closePartnerPanel}>Cancel</Button>
              <Button onClick={submitPartner} disabled={isSavingPartner} className="bg-[#2a9d72] hover:bg-[#238c63] text-white">
                {isSavingPartner ? "Saving..." : editingPartner ? "Save Changes" : "Add Partner"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assignment Create / Edit Panel ──────────────────────────────────── */}
      {assignPanelOpen && viewTarget && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeAssignPanel} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0e2118]">
              <div>
                <h2 className="text-base font-bold text-white">{editingAssign ? "Edit Assignment" : "New Assignment"}</h2>
                <p className="text-xs text-[#7bc5a6] mt-0.5">{viewTarget.partnerName}</p>
              </div>
              <button onClick={closeAssignPanel} className="text-gray-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitAssign} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Safehouse</label>
                <select value={assignForm.safehouseId ?? ""} onChange={e => setAF("safehouseId", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                  <option value="">— Not specified —</option>
                  {safehouses.map(s => <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseName ?? `#${s.safehouseId}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Program Area <span className="text-red-500">*</span></label>
                <input type="text" value={assignForm.programArea} onChange={e => setAF("programArea", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none"
                  placeholder="e.g. Legal Support, Medical Assistance" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assignment Start</label>
                  <input type="date" value={assignForm.assignmentStart} onChange={e => setAF("assignmentStart", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assignment End</label>
                  <input type="date" value={assignForm.assignmentEnd} onChange={e => setAF("assignmentEnd", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select value={assignForm.status} onChange={e => setAF("status", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#2a9d72] focus:outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Responsibility Notes</label>
                <textarea rows={3} value={assignForm.responsibilityNotes} onChange={e => setAF("responsibilityNotes", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2a9d72] focus:outline-none resize-none"
                  placeholder="Describe the responsibilities under this assignment..." />
              </div>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                assignForm.isPrimary ? "border-[#2a9d72] bg-[#f0faf5]" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
                <input type="checkbox" checked={assignForm.isPrimary} onChange={e => setAF("isPrimary", e.target.checked)} className="mt-0.5 accent-[#2a9d72]" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Primary Assignment</p>
                  <p className="text-xs text-gray-500">This is the partner's principal role in this safehouse</p>
                </div>
              </label>
              {assignFormError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{assignFormError}</p>}
            </form>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={closeAssignPanel}>Cancel</Button>
              <Button onClick={submitAssign} disabled={isSavingAssign} className="bg-[#2a9d72] hover:bg-[#238c63] text-white">
                {isSavingAssign ? "Saving..." : editingAssign ? "Save Changes" : "Create Assignment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Partner Confirmation ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="font-bold text-gray-900">Remove Partner</h3><p className="text-xs text-gray-500">This cannot be undone</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-5">Remove <span className="font-semibold">{deleteTarget.partnerName ?? "this partner"}</span> from the network?</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => deletePartnerM.mutate(deleteTarget.partnerId)} disabled={deletePartnerM.isPending}
                className="bg-red-600 hover:bg-red-700 text-white">
                {deletePartnerM.isPending ? "Removing..." : "Remove Partner"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Assignment Confirmation ──────────────────────────────────── */}
      {deleteAssign && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteAssign(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="font-bold text-gray-900">Remove Assignment</h3><p className="text-xs text-gray-500">This cannot be undone</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Remove the <span className="font-semibold">{deleteAssign.programArea ?? "assignment"}</span>
              {deleteAssign.safehouseName ? <> at <span className="font-semibold">{deleteAssign.safehouseName}</span></> : ""}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteAssign(null)}>Cancel</Button>
              <Button onClick={() => deleteAssignM.mutate(deleteAssign.assignmentId)} disabled={deleteAssignM.isPending}
                className="bg-red-600 hover:bg-red-700 text-white">
                {deleteAssignM.isPending ? "Removing..." : "Remove Assignment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
