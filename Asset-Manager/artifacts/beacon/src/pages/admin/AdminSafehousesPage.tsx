import { useListSafehouses } from "@/services";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Building2, Users, Activity, Phone, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminSafehousesPage() {
  const { page, pageSize, setPage } = useQueryPagination();
  const { data, isLoading } = useListSafehouses({ page, pageSize });
  const safehouses = data?.data ?? [];
  const total = (data as { total?: number })?.total ?? safehouses.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-[#2a9d72]" />
          Safehouses
        </h1>
        <p className="text-gray-500 mt-1">View and monitor all safehouse locations in the network</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Loading safehouses...</div>
      ) : safehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <Building2 className="h-8 w-8" />
          <p>No safehouses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {safehouses.map(sh => (
            <div key={sh.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{sh.name}</h3>
                  <p className="text-sm text-gray-500">{sh.location}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sh.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {sh.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {sh.contactName && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Contact: {sh.contactName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>Capacity: <strong className="text-gray-900">{sh.capacity}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>Current occupancy: <strong className="text-gray-900">{sh.currentOccupancy}</strong></span>
                </div>
                {sh.programAreas && sh.programAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {sh.programAreas.map(area => (
                      <span key={area} className="text-xs bg-[#f0faf5] text-[#2a9d72] px-2 py-0.5 rounded-full">{area}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-50">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Occupancy</span>
                  <span>{sh.currentOccupancy} / {sh.capacity}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (sh.currentOccupancy / (sh.capacity || 1)) * 100)}%`,
                      backgroundColor: "#2a9d72",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Showing page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
