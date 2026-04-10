import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Eye, Heart, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiDelete } from "@/services/api";
import { useListSupporters, type Supporter } from "@/services/supporters.service";
import { SupporterFormModal } from "./SupporterFormModal";
import { SupporterProfileDrawer } from "./SupporterProfileDrawer";

function supporterDisplayName(supporter: Supporter) {
  return supporter.displayName
    || `${supporter.firstName ?? ""} ${supporter.lastName ?? ""}`.trim()
    || supporter.organizationName
    || supporter.organization
    || "—";
}

function fmtPeso(value?: number | null) {
  return `PHP ${Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

interface SupporterManagementPanelProps {
  pageSize?: number;
}

export function SupporterManagementPanel({ pageSize = 50 }: SupporterManagementPanelProps) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedSupporterId, setSelectedSupporterId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingSupporter, setEditingSupporter] = useState<Supporter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supporter | null>(null);

  const { data, isLoading } = useListSupporters({ page, pageSize });
  const supporters = data?.data ?? [];

  const filteredSupporters = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return supporters;
    }

    return supporters.filter((supporter) =>
      supporterDisplayName(supporter).toLowerCase().includes(normalizedSearch)
      || (supporter.email ?? "").toLowerCase().includes(normalizedSearch)
      || (supporter.organizationName ?? supporter.organization ?? "").toLowerCase().includes(normalizedSearch));
  }, [search, supporters]);

  const canDelete = user?.role === "admin" || user?.role === "super_admin";

  const deleteMutation = useMutation({
    mutationFn: async (supporterId: number) => apiDelete(`/api/supporters/${supporterId}`, token ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["supporters"] });
      void queryClient.invalidateQueries({ queryKey: ["supporters", "stats"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <DeleteConfirmModal
        open={!!deleteTarget}
        itemName={deleteTarget ? supporterDisplayName(deleteTarget) : undefined}
        description="This removes the supporter record from the donors menu."
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.supporterId && !deleteTarget?.id) return;
          deleteMutation.mutate(Number(deleteTarget.supporterId ?? deleteTarget.id));
        }}
      />

      <SupporterFormModal
        open={formMode !== null}
        mode={formMode ?? "create"}
        supporter={formMode === "edit" ? editingSupporter : null}
        onClose={() => {
          setFormMode(null);
          setEditingSupporter(null);
        }}
        onSaved={(supporter) => {
          const nextId = Number(supporter.supporterId ?? supporter.id ?? 0);
          if (nextId > 0) {
            setSelectedSupporterId(nextId);
          }
        }}
      />

      <SupporterProfileDrawer
        open={selectedSupporterId !== null}
        supporterId={selectedSupporterId}
        onClose={() => setSelectedSupporterId(null)}
        onEdit={(supporter) => {
          setEditingSupporter(supporter);
          setFormMode("edit");
        }}
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supporters by name, email, or organization..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/20 focus:border-[#2a9d72]"
            />
          </div>
          <Button
            onClick={() => {
              setEditingSupporter(null);
              setFormMode("create");
            }}
            className="bg-[#2a9d72] hover:bg-[#23856a]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supporter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lifetime Giving</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gifts</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Gift</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <tr key={`supporter-loading-${index}`}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-6 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredSupporters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No supporters found on this page.
                  </td>
                </tr>
              ) : filteredSupporters.map((supporter) => {
                const supporterId = Number(supporter.supporterId ?? supporter.id ?? 0);
                const recurring = supporter.recurringEnabled || supporter.hasRecurring;
                const status = (supporter.status ?? "Active").toLowerCase();
                const statusClass = status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600";

                return (
                  <tr
                    key={supporterId}
                    className="hover:bg-[#f8faf9] transition-colors cursor-pointer"
                    onClick={() => setSelectedSupporterId(supporterId)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-left">
                        <div className="font-semibold text-[#0e2118] hover:text-[#2a9d72] transition-colors">
                          {supporterDisplayName(supporter)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{supporter.email ?? "—"}</div>
                        {supporter.region && (
                          <div className="text-xs text-gray-400 mt-0.5">{supporter.region}{supporter.country ? `, ${supporter.country}` : ""}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{supporter.supporterType ?? supporter.supportType ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{supporter.acquisitionChannel ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#0e2118]">{fmtPeso(supporter.lifetimeGiving)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{supporter.donationCount ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(supporter.lastGiftDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                          {supporter.status ?? "Active"}
                        </span>
                        {recurring && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2a9d72]">
                            <Heart className="w-3 h-3" />
                            Recurring
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <button
                          onClick={() => setSelectedSupporterId(supporterId)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-[#2a9d72] transition-colors"
                          aria-label="View supporter"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSupporter(supporter);
                            setFormMode("edit");
                          }}
                          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-[#2a9d72] transition-colors"
                          aria-label="Edit supporter"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(supporter)}
                            className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Delete supporter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(data?.total ?? 0) > pageSize && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span>Total supporters: {data?.total ?? 0}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400">Page {page}</span>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= Math.ceil((data?.total ?? 0) / pageSize)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {deleteMutation.isPending && (
          <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Deleting supporter...
          </div>
        )}
      </div>
    </>
  );
}
