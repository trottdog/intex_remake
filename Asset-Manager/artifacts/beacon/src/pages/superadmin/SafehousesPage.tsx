import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import {
  Building2, Users, CheckCircle, XCircle, Loader2, Phone, Mail,
  Plus, Pencil, Trash2, X, Search, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Safehouse {
  safehouseId: number;
  name: string | null;
  location: string | null;
  capacity: number;
  currentOccupancy: number;
  status: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  programAreas: string[] | null;
  description: string | null;
  operatingHours: string | null;
}

type SafehouseForm = {
  name: string;
  location: string;
  capacity: string;
  currentOccupancy: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  programAreasRaw: string;
  description: string;
  operatingHours: string;
};

const EMPTY_FORM: SafehouseForm = {
  name: "", location: "", capacity: "", currentOccupancy: "0",
  status: "active", contactName: "", contactEmail: "", contactPhone: "",
  programAreasRaw: "", description: "", operatingHours: "",
};

const STATUS_AREAS = ["Outreach", "Education", "Wellbeing", "Legal Support", "Medical Support", "Livelihood", "Psychosocial"];

function OccupancyBar({ current, capacity }: { current: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#2a9d72]";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{current} residents</span>
        <span>{capacity} capacity</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400">{pct.toFixed(0)}% occupied</p>
    </div>
  );
}

function formToPayload(f: SafehouseForm) {
  return {
    name: f.name || null,
    location: f.location || null,
    capacity: parseInt(f.capacity) || 0,
    currentOccupancy: parseInt(f.currentOccupancy) || 0,
    status: f.status || "active",
    contactName: f.contactName || null,
    contactEmail: f.contactEmail || null,
    contactPhone: f.contactPhone || null,
    programAreas: f.programAreasRaw ? f.programAreasRaw.split(",").map(s => s.trim()).filter(Boolean) : [],
    description: f.description || null,
    operatingHours: f.operatingHours || null,
  };
}

export default function SafehousesPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Safehouse | null>(null);
  const [form, setForm] = useState<SafehouseForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Safehouse | null>(null);
  const [detailTarget, setDetailTarget] = useState<Safehouse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-safehouses"],
    queryFn: () => apiFetch<{ data: Safehouse[]; total: number }>("/api/safehouses?limit=100", token ?? undefined),
    enabled: !!token,
  });

  const safehouses = (data?.data ?? []).filter(h => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q) || h.status?.toLowerCase().includes(q));
  });

  const totalCapacity   = (data?.data ?? []).reduce((s, h) => s + (h.capacity ?? 0), 0);
  const totalOccupancy  = (data?.data ?? []).reduce((s, h) => s + (h.currentOccupancy ?? 0), 0);
  const activeCount     = (data?.data ?? []).filter(h => h.status === "active").length;
  const availBeds       = Math.max(0, totalCapacity - totalOccupancy);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["superadmin-safehouses"] });

  const createM = useMutation({
    mutationFn: (body: object) => apiPost<Safehouse>("/api/safehouses", body, token ?? undefined),
    onSuccess: () => { invalidate(); closePanel(); },
    onError: () => setFormError("Failed to save safehouse."),
  });
  const updateM = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiPatch<Safehouse>(`/api/safehouses/${id}`, body, token ?? undefined),
    onSuccess: () => { invalidate(); closePanel(); },
    onError: () => setFormError("Failed to update safehouse."),
  });
  const deleteM = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/safehouses/${id}`, token ?? undefined),
    onSuccess: () => { invalidate(); setDeleteTarget(null); setDetailTarget(null); },
  });

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setFormError(""); setPanelOpen(true);
  }
  function openEdit(h: Safehouse) {
    setEditing(h);
    setForm({
      name: h.name ?? "", location: h.location ?? "",
      capacity: String(h.capacity ?? 0), currentOccupancy: String(h.currentOccupancy ?? 0),
      status: h.status ?? "active", contactName: h.contactName ?? "",
      contactEmail: h.contactEmail ?? "", contactPhone: h.contactPhone ?? "",
      programAreasRaw: (h.programAreas ?? []).join(", "),
      description: h.description ?? "", operatingHours: h.operatingHours ?? "",
    });
    setFormError(""); setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); setEditing(null); setFormError(""); }
  function setF<K extends keyof SafehouseForm>(k: K, v: SafehouseForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Safehouse name is required."); return; }
    if (!form.capacity || isNaN(parseInt(form.capacity))) { setFormError("Valid capacity is required."); return; }
    const payload = formToPayload(form);
    if (editing) updateM.mutate({ id: editing.safehouseId, body: payload });
    else createM.mutate(payload);
  }

  const isSaving = createM.isPending || updateM.isPending;

  const toggleArea = (area: string) => {
    const arr = form.programAreasRaw.split(",").map(s => s.trim()).filter(Boolean);
    const next = arr.includes(area) ? arr.filter(a => a !== area) : [...arr, area];
    setF("programAreasRaw", next.join(", "));
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove the safehouse and all associated data. This action cannot be undone."
        isPending={deleteM.isPending}
        onConfirm={() => deleteTarget && deleteM.mutate(deleteTarget.safehouseId)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Safehouse Network</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor all safehouse facilities across the organization</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0e2118] text-white hover:bg-[#1a3a28]">
          <Plus className="w-4 h-4 mr-2" /> Add Safehouse
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Safehouses",  value: data?.data.length ?? 0, sub: `${activeCount} active` },
          { label: "Total Capacity",    value: totalCapacity,          sub: "beds available" },
          { label: "Current Residents", value: totalOccupancy,         sub: totalCapacity > 0 ? `${((totalOccupancy / totalCapacity) * 100).toFixed(0)}% occupancy` : "—" },
          { label: "Available Beds",    value: availBeds,              sub: "open placements" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? "—" : kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search by name, location, or status..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-[#2a9d72]" />
        </div>
      ) : safehouses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-medium">{search ? "No safehouses match your search" : "No safehouses on record"}</p>
          {!search && <p className="text-xs mt-1">Use "Add Safehouse" to register the first facility</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {safehouses.map(house => (
            <div key={house.safehouseId}
              onClick={() => setDetailTarget(house)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 cursor-pointer hover:border-[#2a9d72]/30 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0e2118] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#2a9d72]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{house.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{house.location}</p>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  house.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {house.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {house.status}
                </span>
              </div>

              <OccupancyBar current={house.currentOccupancy ?? 0} capacity={house.capacity ?? 0} />

              {(house.programAreas ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(house.programAreas ?? []).map(area => (
                    <span key={area} className="text-xs bg-[#0e2118]/8 text-[#0e2118] px-2 py-0.5 rounded-full">{area}</span>
                  ))}
                </div>
              )}

              {(house.contactName || house.contactEmail) && (
                <div className="pt-3 border-t border-gray-100 space-y-1">
                  {house.contactName && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="w-3 h-3" /><span>{house.contactName}</span>
                    </div>
                  )}
                  {house.contactEmail && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3 h-3" /><span className="truncate">{house.contactEmail}</span>
                    </div>
                  )}
                  {house.contactPhone && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3 h-3" /><span>{house.contactPhone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-gray-50">
                <button onClick={e => { e.stopPropagation(); openEdit(house); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={e => { e.stopPropagation(); setDeleteTarget(house); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Slide-over ─────────────────────────────────────────────────── */}
      {detailTarget && !panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setDetailTarget(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 bg-[#0e2118] shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#7bc5a6]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{detailTarget.name}</h2>
                    <p className="text-xs text-[#7bc5a6]">{detailTarget.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { openEdit(detailTarget); setDetailTarget(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setDeleteTarget(detailTarget); setDetailTarget(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button onClick={() => setDetailTarget(null)} className="ml-1 text-gray-300 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Capacity</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{detailTarget.capacity}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Current</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{detailTarget.currentOccupancy}</p>
                </div>
              </div>
              <OccupancyBar current={detailTarget.currentOccupancy ?? 0} capacity={detailTarget.capacity ?? 0} />

              {detailTarget.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm text-gray-700">{detailTarget.description}</p>
                </div>
              )}
              {(detailTarget.programAreas ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Program Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailTarget.programAreas ?? []).map(a => (
                      <span key={a} className="text-xs bg-[#f0faf5] text-[#2a9d72] px-3 py-1 rounded-full font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {detailTarget.contactName && <div className="flex items-center gap-2 text-sm text-gray-700"><Users className="w-4 h-4 text-gray-400" />{detailTarget.contactName}</div>}
                {detailTarget.contactEmail && <div className="flex items-center gap-2 text-sm text-gray-700"><Mail className="w-4 h-4 text-gray-400" />{detailTarget.contactEmail}</div>}
                {detailTarget.contactPhone && <div className="flex items-center gap-2 text-sm text-gray-700"><Phone className="w-4 h-4 text-gray-400" />{detailTarget.contactPhone}</div>}
                {detailTarget.operatingHours && <div className="text-sm text-gray-500">Hours: {detailTarget.operatingHours}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Panel ───────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#0e2118] shrink-0 flex items-start justify-between">
              <div>
                <p className="text-[#7bc5a6] text-xs font-semibold uppercase tracking-wide">
                  {editing ? "Edit Safehouse" : "New Safehouse"}
                </p>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {editing ? editing.name : "Register facility"}
                </h2>
              </div>
              <button onClick={closePanel} className="text-gray-300 hover:text-white mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Basic Information</div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Safehouse Name <span className="text-red-400">*</span></Label>
                  <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Bahay ni Maria" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Location / Address</Label>
                  <Input value={form.location} onChange={e => setF("location", e.target.value)} placeholder="City, Province" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Capacity (beds) <span className="text-red-400">*</span></Label>
                    <Input type="number" min="1" value={form.capacity} onChange={e => setF("capacity", e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Current Occupancy</Label>
                    <Input type="number" min="0" value={form.currentOccupancy} onChange={e => setF("currentOccupancy", e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Status</Label>
                  <select value={form.status} onChange={e => setF("status", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Description</Label>
                  <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 resize-none"
                    placeholder="Brief description..." />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Operating Hours</Label>
                  <Input value={form.operatingHours} onChange={e => setF("operatingHours", e.target.value)} placeholder="e.g. 24/7 or Mon-Fri 8am-5pm" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Information</div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Contact Person</Label>
                  <Input value={form.contactName} onChange={e => setF("contactName", e.target.value)} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
                    <Input type="email" value={form.contactEmail} onChange={e => setF("contactEmail", e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Phone</Label>
                    <Input value={form.contactPhone} onChange={e => setF("contactPhone", e.target.value)} placeholder="+63 912 345 6789" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Program Areas</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_AREAS.map(area => {
                    const selected = form.programAreasRaw.split(",").map(s => s.trim()).includes(area);
                    return (
                      <button key={area} type="button" onClick={() => toggleArea(area)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                          selected ? "bg-[#0e2118] text-[#7bc5a6] border-[#0e2118]" : "bg-white text-gray-600 border-gray-200 hover:border-[#2a9d72]"
                        }`}>
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={closePanel}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-[#2a9d72] hover:bg-[#238c63] text-white">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save Changes" : "Create Safehouse"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
