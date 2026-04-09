import { Shield, Lock, AlertTriangle, CheckCircle, Key, FileText, Eye, Clock } from "lucide-react";

type ComplianceItem = {
  label: string;
  status: "compliant" | "review" | "pending";
  notes: string;
};

const COMPLIANCE_MATRIX: ComplianceItem[] = [
  { label: "Data Encryption at Rest", status: "compliant", notes: "PostgreSQL with AES-256 encryption enabled on all PII fields" },
  { label: "Data Encryption in Transit", status: "compliant", notes: "TLS 1.3 enforced; HTTP redirected to HTTPS in production" },
  { label: "Role-Based Access Control (RBAC)", status: "compliant", notes: "5-tier role hierarchy: super_admin, admin, staff, donor, public" },
  { label: "Audit Trail Logging", status: "compliant", notes: "All create/update/delete/login actions logged with actor attribution" },
  { label: "JWT Token Security", status: "compliant", notes: "Ephemeral signing secret; tokens stored in-memory only; no cookies" },
  { label: "Multi-Factor Authentication", status: "review", notes: "MFA flag present on users; TOTP flow not yet fully wired in UI" },
  { label: "Password Policy Enforcement", status: "compliant", notes: "Minimum 12 chars, uppercase, numbers, special characters required" },
  { label: "Input Sanitization", status: "compliant", notes: "Server-side sanitization middleware applied to all API routes" },
  { label: "Content Security Policy (CSP)", status: "compliant", notes: "Strict self-only CSP; no inline scripts; connect-src scoped to API" },
  { label: "HSTS (HTTP Strict Transport Security)", status: "compliant", notes: "max-age=31536000 with includeSubDomains and preload directives" },
  { label: "Rate Limiting", status: "compliant", notes: "500 req/min per IP applied globally on all API routes" },
  { label: "CORS Policy", status: "compliant", notes: "Origin-whitelist based; wildcard origin blocked in production" },
  { label: "Data Retention Policy", status: "pending", notes: "Policy framework defined; automated purge schedule not yet configured" },
  { label: "Backup & Recovery", status: "review", notes: "Database backups managed by hosting provider; DR plan in draft" },
  { label: "RA 9208 / RA 10364 Compliance", status: "compliant", notes: "Safehouse data compartmentalized; beneficiary records access-restricted to assigned staff only" },
  { label: "RA 10173 Data Privacy Act", status: "compliant", notes: "PII access restricted by RBAC; consent tracking on supporter profiles" },
];

const SECURITY_CONTROLS = [
  { icon: Lock, label: "JWT Secret Rotation", desc: "Ephemeral runtime secret; invalidates on restart (enforces re-auth)" },
  { icon: Key, label: "RBAC Enforcement", desc: "Every route explicitly requires role check via requireRoles middleware" },
  { icon: Eye, label: "IDOR Prevention", desc: "Donors scoped to own data; admins cannot access cross-safehouse data without super_admin role" },
  { icon: FileText, label: "Immutable Audit Logs", desc: "No UPDATE/DELETE permitted on audit_logs table; append-only by design" },
  { icon: AlertTriangle, label: "Impact Snapshot Gating", desc: "Public endpoint enforces isPublished=true; unpublished snapshots return 404" },
  { icon: Clock, label: "Session Timeout", desc: "In-memory JWT cleared on page reload; no persistent session storage" },
];

const statusConfig = {
  compliant: { label: "Compliant", class: "bg-green-100 text-green-700", icon: CheckCircle },
  review: { label: "Under Review", class: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  pending: { label: "Pending", class: "bg-gray-100 text-gray-600", icon: Clock },
};

export default function SecurityCompliancePage() {
  const compliantCount = COMPLIANCE_MATRIX.filter((c) => c.status === "compliant").length;
  const reviewCount = COMPLIANCE_MATRIX.filter((c) => c.status === "review").length;
  const pendingCount = COMPLIANCE_MATRIX.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">IS 414 security posture, RBAC controls, and regulatory compliance matrix</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{compliantCount}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-green-600 mt-1">Compliant</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-700">{reviewCount}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-amber-600 mt-1">Under Review</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-700">{pendingCount}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">Pending</div>
        </div>
      </div>

      {/* Security Controls */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#2a9d72]" /> Active Security Controls
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECURITY_CONTROLS.map((ctrl) => (
            <div key={ctrl.label} className="p-3 bg-[#f9f9f8] rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <ctrl.icon className="w-4 h-4 text-[#2a9d72] shrink-0" />
                <div className="font-medium text-sm text-gray-900">{ctrl.label}</div>
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">{ctrl.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Matrix */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Compliance Matrix</h3>
          <p className="text-xs text-gray-500 mt-1">IS 413 / IS 414 / RA 9208 / RA 10173 requirements</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Requirement</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {COMPLIANCE_MATRIX.map((item) => {
              const cfg = statusConfig[item.status];
              const StatusIcon = cfg.icon;
              return (
                <tr key={item.label} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 text-sm">{item.label}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.class}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{item.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
