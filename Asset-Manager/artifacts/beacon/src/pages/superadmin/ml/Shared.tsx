import { Loader2, AlertTriangle, InboxIcon, ShieldAlert, X } from "lucide-react";

export const ACCENT = "#2a9d72";
export const DARK = "#0e2118";
export const MINT = "#7bc5a6";

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtPeso(v: string | number | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function fmtScore(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(3);
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return v;
  }
}

export function fmtRelativeDate(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    const diff = Date.now() - new Date(v).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch {
    return v;
  }
}

// ── Band / Score visual helpers ───────────────────────────────────────────────

export const BAND_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "at-risk":          { bg: "bg-red-100",    text: "text-red-700",    dot: "#ef4444" },
  "critical":         { bg: "bg-red-100",    text: "text-red-700",    dot: "#ef4444" },
  "high":             { bg: "bg-orange-100", text: "text-orange-700", dot: "#f97316" },
  "high-risk":        { bg: "bg-orange-100", text: "text-orange-700", dot: "#f97316" },
  "moderate":         { bg: "bg-amber-100",  text: "text-amber-700",  dot: "#f59e0b" },
  "medium":           { bg: "bg-amber-100",  text: "text-amber-700",  dot: "#f59e0b" },
  "stable":           { bg: "bg-green-100",  text: "text-green-700",  dot: "#22c55e" },
  "low":              { bg: "bg-green-100",  text: "text-green-700",  dot: "#22c55e" },
  "low-risk":         { bg: "bg-green-100",  text: "text-green-700",  dot: "#22c55e" },
  "engaged":          { bg: "bg-teal-100",   text: "text-teal-700",   dot: "#0d9488" },
  "high-potential":   { bg: "bg-blue-100",   text: "text-blue-700",   dot: "#3b82f6" },
  "ready":            { bg: "bg-teal-100",   text: "text-teal-700",   dot: "#0d9488" },
  "needs-support":    { bg: "bg-amber-100",  text: "text-amber-700",  dot: "#f59e0b" },
  "high-impact":      { bg: "bg-green-100",  text: "text-green-700",  dot: "#22c55e" },
  "low-impact":       { bg: "bg-red-100",    text: "text-red-700",    dot: "#ef4444" },
  "high-converter":   { bg: "bg-green-100",  text: "text-green-700",  dot: "#22c55e" },
  "moderate-converter": { bg: "bg-amber-100", text: "text-amber-700", dot: "#f59e0b" },
  "low-converter":    { bg: "bg-red-100",    text: "text-red-700",    dot: "#ef4444" },
  "major-gap":        { bg: "bg-red-100",    text: "text-red-700",    dot: "#ef4444" },
  "minor-gap":        { bg: "bg-amber-100",  text: "text-amber-700",  dot: "#f59e0b" },
  "on-track":         { bg: "bg-green-100",  text: "text-green-700",  dot: "#22c55e" },
  "strong":           { bg: "bg-teal-100",   text: "text-teal-700",   dot: "#0d9488" },
  "insufficient-data":{ bg: "bg-gray-100",   text: "text-gray-500",   dot: "#94a3b8" },
  "not-ready":        { bg: "bg-gray-100",   text: "text-gray-500",   dot: "#94a3b8" },
};

function bandStyle(band: string | null | undefined) {
  return BAND_COLORS[(band ?? "").toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-500", dot: "#94a3b8" };
}

export function BandBadge({ band, size = "sm" }: { band: string | null | undefined; size?: "xs" | "sm" }) {
  if (!band) return <span className="text-gray-300 text-xs">—</span>;
  const s = bandStyle(band);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${size === "xs" ? "text-[10px]" : "text-xs"} ${s.bg} ${s.text}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
      {band.replace(/-/g, " ")}
    </span>
  );
}

export function ScoreBar({
  score,
  max = 1,
  invertColors = false,
}: {
  score: number | null | undefined;
  max?: number;
  invertColors?: boolean;
}) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  // Some sources return scores as 0..1 while others return 0..100.
  const normalizedScore = score > max ? score / 100 : score;
  const pct = Math.min(100, Math.max(0, (normalizedScore / max) * 100));
  const color = invertColors
    ? normalizedScore >= 0.7 * max ? "#22c55e" : normalizedScore >= 0.4 * max ? "#f59e0b" : "#ef4444"
    : normalizedScore >= 0.7 * max ? "#ef4444" : normalizedScore >= 0.4 * max ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-600 shrink-0 w-10 text-right">{(normalizedScore * 100).toFixed(0)}%</span>
    </div>
  );
}

// ── State indicators ──────────────────────────────────────────────────────────

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <Loader2 className="w-7 h-7 animate-spin text-[#2a9d72]" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ label = "Failed to load data", onRetry }: { label?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <AlertTriangle className="w-7 h-7 text-amber-400" />
      <span className="text-sm font-medium text-gray-600">{label}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-[#2a9d72] hover:underline font-medium">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label = "No data available" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
      <InboxIcon className="w-8 h-8" />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

export function PrivacyBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
      <span>
        <strong>{count}</strong> record{count !== 1 ? "s" : ""} excluded — privacy-restricted (ML scores not disclosed)
      </span>
    </div>
  );
}

// ── Card / Section headers ────────────────────────────────────────────────────

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

export function TabBar<T extends string>({
  tabs, active, onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === t.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Date range selector ───────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "6mo", value: "6mo" },
  { label: "12mo", value: "12mo" },
];

export function DateRangeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
      {DATE_RANGES.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === opt.value
              ? "bg-[#0e2118] text-white"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Filter select ─────────────────────────────────────────────────────────────

export function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2a9d72] cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Side Drawer ───────────────────────────────────────────────────────────────

export function SideDrawer({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

export function Pagination({
  page, total, pageSize, onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
      <span className="text-xs text-gray-400">
        {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2.5 py-1 rounded text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-2.5 py-1 rounded text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

export function ActionButton({
  label, onClick, variant = "default", disabled = false,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
}) {
  const cls = variant === "primary"
    ? "bg-[#0e2118] text-white hover:bg-[#1a3528]"
    : variant === "danger"
    ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {label}
    </button>
  );
}
