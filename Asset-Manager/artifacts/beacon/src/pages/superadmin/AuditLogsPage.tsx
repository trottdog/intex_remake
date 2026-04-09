import { useListAuditLogs, type AuditLog } from "@/services/superadmin.service";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { Search, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  VIEW: "bg-purple-100 text-purple-700",
};

export default function AuditLogsPage() {
  const { page, pageSize, setPage } = useQueryPagination();
  const { data, isLoading } = useListAuditLogs({ page, pageSize });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Complete record of all system actions for security compliance</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
        <Shield className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm text-amber-800">All actions in Beacon are logged and attributable. These logs are immutable and retained for compliance.</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search logs..." className="pl-9" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td></tr>)
            ) : (data?.data ?? []).map((log: AuditLog) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{log.actorName}</td>
                <td className="px-4 py-3 capitalize text-gray-500 text-xs">{log.actorRole?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize text-xs">{log.entityType?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{log.entityDescription ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data?.total ?? 0) > pageSize && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{data?.total ?? 0} log entries</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil((data?.total ?? 1) / pageSize)} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
