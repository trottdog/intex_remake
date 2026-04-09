import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListUsers, useListSafehouses, createUser, updateUser, disableUser, enableUser, type User, type CreateUserPayload, type UpdateUserPayload } from "@/services/superadmin.service";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Plus, Search, Shield, UserCheck, UserX, Loader2, Edit2, Power, X, AlertCircle, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  staff: "bg-teal-100 text-teal-700",
  donor: "bg-green-100 text-green-700",
};

const ROLE_OPTIONS: {
  value: CreateUserPayload["role"];
  label: string;
  description: string;
  color: string;
  border: string;
}[] = [
  {
    value: "staff",
    label: "Staff",
    description: "View residents and case files for assigned safehouses",
    color: "text-teal-700 bg-teal-50",
    border: "border-teal-300",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full case management, donor relations, and reporting",
    color: "text-blue-700 bg-blue-50",
    border: "border-blue-300",
  },
  {
    value: "donor",
    label: "Donor",
    description: "Access donor portal and giving history only",
    color: "text-green-700 bg-green-50",
    border: "border-green-300",
  },
  {
    value: "super_admin",
    label: "Super Admin",
    description: "Full system access including user and safehouse management",
    color: "text-purple-700 bg-purple-50",
    border: "border-purple-300",
  },
];

type ModalMode = "add" | "edit" | null;

const EMPTY_CREATE: CreateUserPayload = {
  firstName: "", lastName: "", email: "", username: "", password: "",
  role: "staff", assignedSafehouses: [],
};

function passwordStrength(pw: string): { score: number; rules: { label: string; ok: boolean }[] } {
  const rules = [
    { label: "At least 12 characters", ok: pw.length >= 12 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "Lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "Number", ok: /[0-9]/.test(pw) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  return { score: rules.filter(r => r.ok).length, rules };
}

export default function UsersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { page, setPage } = useQueryPagination();
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [createForm, setCreateForm] = useState<CreateUserPayload>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({});
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  const { data, isLoading } = useListUsers({ page, pageSize: 20 });
  const { data: safehousesData } = useListSafehouses({ pageSize: 100 });
  const safehouses = safehousesData?.data ?? [];
  const shMap = Object.fromEntries(safehouses.map(s => [s.safehouseId!, s.name ?? ""]));

  const [createSafehouseId, setCreateSafehouseId] = useState<number | null>(null);
  const [editSafehouseId, setEditSafehouseId] = useState<number | null>(null);

  const rows = (data?.data ?? []).filter((u: User) =>
    !search || `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ListUsers"] });

  const openAdd = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateSafehouseId(null);
    setConfirmPassword("");
    setShowPassword(false);
    setFormError(null);
    setModalMode("add");
  };

  const openEdit = (u: User) => {
    setSelected(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role as UpdateUserPayload["role"] });
    setEditSafehouseId(u.assignedSafehouses?.[0] ?? null);
    setFormError(null);
    setModalMode("edit");
  };

  const handleCreate = async () => {
    if (!token) return;
    if (!createForm.firstName || !createForm.lastName || !createForm.username || !createForm.email || !createForm.password) {
      return setFormError("All fields are required.");
    }
    if (createForm.password !== confirmPassword) {
      return setFormError("Passwords do not match.");
    }
    const { score } = passwordStrength(createForm.password);
    if (score < 5) {
      return setFormError("Password does not meet all requirements.");
    }
    setSaving(true); setFormError(null);
    try {
      const payload: CreateUserPayload = {
        ...createForm,
        assignedSafehouses: createSafehouseId ? [createSafehouseId] : [],
      };
      await createUser(payload, token);
      await invalidate();
      setModalMode(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!token || !selected) return;
    setSaving(true); setFormError(null);
    try {
      await updateUser(selected.id, { ...editForm, assignedSafehouses: editSafehouseId ? [editSafehouseId] : [] }, token);
      await invalidate();
      setModalMode(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to update user");
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (u: User) => {
    if (!token) return;
    try {
      if (u.isActive) await disableUser(u.id, token);
      else await enableUser(u.id, token);
      await invalidate();
    } catch { /* no-op */ }
    setConfirmToggle(null);
  };

  const pwdInfo = passwordStrength(createForm.password);

  return (
    <div className="space-y-6">
      {/* ── Confirm Toggle Modal ───────────────────────────────────────── */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className={`p-2 rounded-full ${confirmToggle.isActive ? "bg-red-50" : "bg-green-50"}`}>
                <AlertCircle className={`w-5 h-5 ${confirmToggle.isActive ? "text-red-500" : "text-[#2a9d72]"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{confirmToggle.isActive ? "Disable Account" : "Enable Account"}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {confirmToggle.isActive
                    ? `This will prevent ${confirmToggle.firstName} ${confirmToggle.lastName} from logging in. You can re-enable them at any time.`
                    : `This will restore ${confirmToggle.firstName} ${confirmToggle.lastName}'s access to the system.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmToggle(null)}>Cancel</Button>
              <Button
                className={confirmToggle.isActive ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#2a9d72] hover:bg-[#238c63] text-white"}
                onClick={() => handleToggleActive(confirmToggle)}
              >
                {confirmToggle.isActive ? "Disable Account" : "Enable Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage staff, admin, and donor accounts</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0e2118] text-white hover:bg-[#1a3a28]">
          <Plus className="w-4 h-4 mr-2" /> Create Account
        </Button>
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by name, username, or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Safehouse</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">MFA</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Login</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : rows.map((u: User) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0e2118]/10 flex items-center justify-center text-xs font-bold text-[#0e2118]">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600 text-xs">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {u.role?.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {(u.role === "admin" || u.role === "staff") && u.assignedSafehouses?.length
                    ? <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">{shMap[u.assignedSafehouses[0]] || `Safehouse #${u.assignedSafehouses[0]}`}</span>
                    : <span className="text-gray-300 text-xs">{(u.role === "admin" || u.role === "staff") ? "Unassigned" : "—"}</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                      <UserCheck className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                      <UserX className="w-3 h-3" /> Disabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.mfaEnabled ? (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-700 font-medium">
                      <Shield className="w-3 h-3" /> On
                    </span>
                  ) : <span className="text-xs text-gray-300">Off</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Edit user">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmToggle(u)}
                      title={u.isActive ? "Disable account" : "Enable account"}
                      className={u.isActive ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                  No users found{search ? ` matching "${search}"` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(data?.total ?? 0) > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{data?.total ?? 0} total users</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="self-center text-xs">Page {page} of {Math.ceil((data?.total ?? 1) / 20)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil((data?.total ?? 1) / 20)} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Account Modal ───────────────────────────────────────── */}
      {modalMode === "add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create New Account</h2>
                <p className="text-xs text-gray-500 mt-0.5">All fields are required</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Basic Info */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Basic Information</div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5 block">First Name</Label>
                      <Input
                        value={createForm.firstName}
                        onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5 block">Last Name</Label>
                      <Input
                        value={createForm.lastName}
                        onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Email Address</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Username</Label>
                    <Input
                      value={createForm.username}
                      onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="system username (no spaces)"
                      autoCapitalize="none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used to log in. Cannot be changed after creation.</p>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Role & Permissions</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {ROLE_OPTIONS.map((opt) => {
                    const selected = createForm.role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, role: opt.value }))}
                        className={`text-left rounded-xl border-2 p-3.5 transition-all ${
                          selected
                            ? `${opt.border} bg-white shadow-sm`
                            : "border-gray-100 bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opt.color}`}>
                            {opt.label}
                          </span>
                          {selected && <Check className="w-3.5 h-3.5 text-[#2a9d72]" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Safehouse Assignment (admin/staff only) */}
              {(createForm.role === "admin" || createForm.role === "staff") && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Safehouse Assignment</div>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30"
                    value={createSafehouseId ?? ""}
                    onChange={e => setCreateSafehouseId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">— No assignment (sees all safehouses) —</option>
                    {safehouses.map(s => (
                      <option key={s.safehouseId} value={s.safehouseId!}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Restrict this account to a specific safehouse. Leave unset to allow access to all.</p>
                </div>
              )}

              {/* Password */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Set Password</div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={createForm.password}
                        onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Create a secure password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {createForm.password.length > 0 && (
                      <div className="mt-2.5 space-y-1">
                        {pwdInfo.rules.map(rule => (
                          <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.ok ? "text-[#2a9d72]" : "text-gray-400"}`}>
                            <Check className={`w-3 h-3 ${rule.ok ? "opacity-100" : "opacity-30"}`} />
                            {rule.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={`pr-10 ${confirmPassword && confirmPassword !== createForm.password ? "border-red-300 focus:ring-red-200" : ""}`}
                      />
                      {confirmPassword && confirmPassword === createForm.password && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a9d72]" />
                      )}
                    </div>
                    {confirmPassword && confirmPassword !== createForm.password && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
              <Button variant="outline" className="flex-1" onClick={() => setModalMode(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#0e2118] text-white hover:bg-[#1a3a28]"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : "Create Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ────────────────────────────────────────────── */}
      {modalMode === "edit" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Account</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selected.username}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">First Name</Label>
                  <Input value={editForm.firstName ?? ""} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">Last Name</Label>
                  <Input value={editForm.lastName ?? ""} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">Email Address</Label>
                <Input type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Role & Permissions</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {ROLE_OPTIONS.map((opt) => {
                    const isSelected = (editForm.role ?? "staff") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, role: opt.value }))}
                        className={`text-left rounded-xl border-2 p-3 transition-all ${
                          isSelected
                            ? `${opt.border} bg-white shadow-sm`
                            : "border-gray-100 bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#2a9d72]" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(editForm.role === "admin" || editForm.role === "staff") && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Safehouse Assignment</div>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30"
                    value={editSafehouseId ?? ""}
                    onChange={e => setEditSafehouseId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">— No assignment (sees all safehouses) —</option>
                    {safehouses.map(s => (
                      <option key={s.safehouseId} value={s.safehouseId!}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Restrict this account to a specific safehouse. Leave unset to allow access to all.</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModalMode(null)}>Cancel</Button>
              <Button className="flex-1 bg-[#0e2118] text-white hover:bg-[#1a3a28]" onClick={handleUpdate} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
