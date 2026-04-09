import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { Users, Heart, TrendingUp, UserCheck } from "lucide-react";

interface Resident {
  id: number;
  residentId?: number;
  residentCode?: string;
  internalCode?: string;
  caseCategory: string | null;
  caseStatus: string | null;
  riskLevel?: string | null;
  currentRiskLevel?: string | null;
  reintegrationStatus: string | null;
  admissionDate?: string | null;
  dateOfAdmission?: string | null;
  presentAge?: string | null;
  ageUponAdmission?: string | null;
}

const REINTEGRATION_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-amber-100 text-amber-700",
  "On Hold":     "bg-orange-100 text-orange-700",
  Completed:     "bg-[#e6f4ee] text-[#0e6641]",
};

const RISK_COLORS: Record<string, string> = {
  Low:      "bg-green-100 text-green-700",
  Medium:   "bg-amber-100 text-amber-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  Active:      "bg-blue-100 text-blue-700",
  Closed:      "bg-gray-100 text-gray-600",
  Transferred: "bg-purple-100 text-purple-700",
};

export default function CaseloadPage() {
  const { token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () =>
      apiFetch<{ data: Resident[]; total: number }>(
        "/api/residents",
        token ?? undefined
      ),
    enabled: !!token,
  });

  const residents = data?.data ?? [];

  const active = residents.filter((r) => r.caseStatus === "Active").length;
  const reintegrating = residents.filter((r) => r.reintegrationStatus === "In Progress").length;
  const highRisk = residents.filter((r) => {
    const risk = r.currentRiskLevel ?? r.riskLevel;
    return risk === "High" || risk === "Critical";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Caseload</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of residents currently in care</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Residents", value: residents.length, icon: Users },
          { label: "Active in Care", value: active, icon: Heart },
          { label: "In Reintegration", value: reintegrating, icon: TrendingUp },
          { label: "High / Critical Risk", value: highRisk, icon: UserCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
              <Icon className="w-4 h-4 text-[#2a9d72]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : residents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No residents in caseload</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Resident</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Risk Level</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Age</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Admission</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Reintegration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {residents.map((r) => {
                const risk = r.currentRiskLevel ?? r.riskLevel;
                const code = r.internalCode ?? r.residentCode ?? `#${r.residentId ?? r.id}`;
                const admission = r.dateOfAdmission ?? r.admissionDate;
                return (
                  <tr key={r.residentId ?? r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0e2118] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {code?.[0]?.toUpperCase() ?? "R"}
                        </div>
                        <div>
                          <p className="font-mono font-medium text-gray-900">{code}</p>
                          <p className="text-xs text-gray-500 capitalize">{r.caseCategory?.replace(/_/g, " ") ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {r.caseStatus ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[r.caseStatus] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.caseStatus}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {risk ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${RISK_COLORS[risk] ?? "bg-gray-100 text-gray-600"}`}>
                          {risk}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {r.presentAge ?? r.ageUponAdmission ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-xs whitespace-nowrap">
                      {admission ? new Date(admission).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {r.reintegrationStatus ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${REINTEGRATION_COLORS[r.reintegrationStatus] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.reintegrationStatus}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
