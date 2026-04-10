import { AlertTriangle, ExternalLink, Info } from "lucide-react";
import { Card, SectionHeader } from "./Shared";
import {
  getPipelineCatalogEntry,
  type PipelineCaveatLevel,
  type PipelineEvidenceLevel,
} from "./pipelineCatalog";

const EVIDENCE_CONFIG: Record<PipelineEvidenceLevel, { label: string; className: string }> = {
  direct: { label: "Direct route", className: "bg-green-100 text-green-700" },
  adjacent: { label: "Adjacent route", className: "bg-amber-100 text-amber-700" },
  model_ops: { label: "Model ops only", className: "bg-slate-100 text-slate-700" },
};

const CAVEAT_CONFIG: Record<PipelineCaveatLevel, { label: string; className: string }> = {
  normal: { label: "Standard", className: "bg-slate-100 text-slate-700" },
  caution: { label: "Needs caveat", className: "bg-amber-100 text-amber-700" },
  high: { label: "High caveat", className: "bg-red-100 text-red-700" },
};

const AUDIT_STATUS_CONFIG = {
  risk: { label: "Risk", className: "bg-red-100 text-red-700" },
} as const;

export function PipelineCoveragePanel({
  title,
  subtitle,
  pipelineNames,
}: {
  title: string;
  subtitle: string;
  pipelineNames: string[];
}) {
  const entries = Array.from(new Set(pipelineNames))
    .map(name => getPipelineCatalogEntry(name))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) return null;

  return (
    <Card>
      <SectionHeader title={title} sub={subtitle} />
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          This panel reflects the reviewed app coverage only. Notebook execution proof and stronger validation still
          live outside the routed UI.
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {entries.map(entry => {
          const evidence = EVIDENCE_CONFIG[entry.evidence];
          const caveat = CAVEAT_CONFIG[entry.caveat];
          const audit = AUDIT_STATUS_CONFIG[entry.auditStatus];

          return (
            <div key={entry.internalName} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{entry.displayName}</div>
                  <div className="mt-0.5 text-[10px] font-mono text-gray-400">{entry.internalName}</div>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${audit.className}`}>
                    {audit.label}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${evidence.className}`}>
                    {evidence.label}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${caveat.className}`}>
                    {caveat.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-xs leading-relaxed text-gray-600">{entry.summary}</div>

              <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Audit Snapshot</div>
                <div className="text-xs leading-relaxed text-gray-600">
                  <span className="font-semibold text-gray-800">Weak:</span> {entry.weak}
                </div>
                <div className="text-xs leading-relaxed text-gray-600">
                  <span className="font-semibold text-gray-800">Missing:</span> {entry.missing}
                </div>
                <div className="text-xs leading-relaxed text-gray-600">
                  <span className="font-semibold text-gray-800">Video safety:</span> {entry.videoSafety}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {entry.links.map(link => (
                  <a
                    key={`${entry.internalName}-${link.href}`}
                    href={link.href}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PipelineInterpretationNotice({
  title,
  body,
  tone = "caution",
}: {
  title: string;
  body: string;
  tone?: "info" | "caution" | "critical";
}) {
  const toneStyles = {
    info: {
      wrap: "border-blue-100 bg-blue-50 text-blue-900",
      icon: "text-blue-600",
    },
    caution: {
      wrap: "border-amber-100 bg-amber-50 text-amber-900",
      icon: "text-amber-600",
    },
    critical: {
      wrap: "border-red-100 bg-red-50 text-red-900",
      icon: "text-red-600",
    },
  } as const;

  const styles = toneStyles[tone];

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${styles.wrap}`}>
      <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${styles.icon}`} />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5">{body}</div>
      </div>
    </div>
  );
}
