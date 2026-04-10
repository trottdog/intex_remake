import { useEffect, useState } from "react";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import {
  useGetDonorChurn, useGetDonorUpgrade, useGetDonorDonationsRecent,
  usePatchDonorAction,
  type DonorChurnItem, type DonorUpgradeItem,
} from "@/services/superadminMl.service";
import {
  BandBadge, ScoreBar, LoadingState, ErrorState, EmptyState,
  PrivacyBanner, SectionHeader, Card, TabBar, DateRangeSelector,
  FilterSelect, SideDrawer, Pagination, ActionButton,
  fmtPeso, fmtDate, fmtRelativeDate, fmtScore,
} from "./ml/Shared";
import { PipelineCoveragePanel, PipelineInterpretationNotice } from "./ml/PipelineCoveragePanel";
import { SupporterManagementPanel } from "@/components/supporters/SupporterManagementPanel";

type Tab = "supporters" | "churn" | "upgrade";

const TABS: { id: Tab; label: string }[] = [
  { id: "supporters", label: "Supporters" },
  { id: "churn", label: "Churn Risk" },
  { id: "upgrade", label: "Upgrade Potential" },
];

const CHURN_BAND_OPTS = [
  { value: "at-risk", label: "At Risk" },
  { value: "moderate", label: "Moderate" },
  { value: "stable", label: "Stable" },
];

const UPGRADE_BAND_OPTS = [
  { value: "high-potential", label: "High Potential" },
  { value: "moderate", label: "Moderate" },
  { value: "not-ready", label: "Not Ready" },
];

function fmtModelScore(value: number | null | undefined): string {
  if (value == null) return "—";
  return value > 1 ? value.toFixed(1) : fmtScore(value);
}

// ── Churn Tab ─────────────────────────────────────────────────────────────────

function ChurnTab() {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState("90d");
  const [churnBand, setChurnBand] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("churnRiskScore");
  const [sortDir, setSortDir] = useState("desc");

  const { data, isLoading, error, refetch } = useGetDonorChurn({
    page, pageSize: 15, dateRange, churnBand: churnBand || undefined,
    sortBy, sortDir,
  });
  const patchDonor = usePatchDonorAction();

  const donors = data?.data ?? [];
  const meta = data?.meta;
  const selectedDonor = donors.find(d => d.supporterId === selectedId) ?? null;

  function toggleSort(field: string) {
    if (sortBy === field) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  function handleAction(id: number, action: string) {
    patchDonor.mutate({ id, body: { churnRecommendedAction: action } });
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          title="Donor Churn Risk"
          sub="Supporters identified by the churn risk model as at-risk of lapsing"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeSelector value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} />
              <FilterSelect
                value={churnBand}
                onChange={v => { setChurnBand(v); setPage(1); }}
                options={CHURN_BAND_OPTS}
                placeholder="All bands"
              />
            </div>
          }
        />

        {meta && <PrivacyBanner count={meta.totalRestricted} />}

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : donors.length === 0 ? (
          <EmptyState label="No donors match the current filters" />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      { key: "displayName", label: "Supporter" },
                      { key: "churnRiskScore", label: "Churn Score" },
                      { key: "churnBand", label: "Band" },
                      { key: "daysSinceLastDonation", label: "Last Donated" },
                      { key: "totalDonationsPhp", label: "Lifetime Value" },
                      { key: "churnRecommendedAction", label: "Action" },
                      { key: "_detail", label: "" },
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap ${col.key !== "_detail" && col.key !== "churnBand" ? "cursor-pointer hover:text-gray-600" : ""}`}
                        onClick={() => col.key !== "_detail" && col.key !== "churnBand" && toggleSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.key === sortBy && col.key !== "_detail" && (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {donors.map(d => (
                    <tr
                      key={d.supporterId}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selectedId === d.supporterId ? "bg-teal-50/50" : ""}`}
                    >
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-gray-900">{d.displayName}</div>
                        <div className="text-xs text-gray-400">{d.email}</div>
                      </td>
                      <td className="py-2.5 pr-4 w-36">
                        <div className="space-y-0.5">
                          <ScoreBar score={d.churnRiskScore} />
                          <div className="text-[10px] text-gray-400">Raw: {fmtModelScore(d.churnRiskScore)}</div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={d.churnBand} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600 whitespace-nowrap">
                        {d.lastDonationDate ? fmtRelativeDate(d.lastDonationDate) : "—"}
                        {d.daysSinceLastDonation != null && (
                          <span className="text-gray-400 ml-1">({d.daysSinceLastDonation}d)</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700 font-medium">
                        {fmtPeso(d.totalDonationsPhp)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {d.churnRecommendedAction ? (
                          <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                            {d.churnRecommendedAction.replace(/-/g, " ")}
                          </span>
                        ) : (
                          <div className="flex gap-1">
                            <ActionButton
                              label="Email"
                              onClick={() => handleAction(d.supporterId, "send-email")}
                              disabled={patchDonor.isPending}
                            />
                            <ActionButton
                              label="Call"
                              onClick={() => handleAction(d.supporterId, "schedule-call")}
                              disabled={patchDonor.isPending}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedId(prev => prev === d.supporterId ? null : d.supporterId)}
                          className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium flex items-center gap-1 ml-auto"
                        >
                          <ExternalLink className="w-3 h-3" /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <Pagination page={page} total={meta.total} pageSize={15} onChange={setPage} />
            )}
          </>
        )}
      </Card>

      <ChurnDrawer
        donor={selectedDonor}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        onAction={handleAction}
        isPending={patchDonor.isPending}
      />
    </div>
  );
}

function ChurnDrawer({
  donor, open, onClose, onAction, isPending,
}: {
  donor: DonorChurnItem | null;
  open: boolean;
  onClose: () => void;
  onAction: (id: number, action: string) => void;
  isPending: boolean;
}) {
  const { data: donationsData, isLoading } = useGetDonorDonationsRecent(donor?.supporterId ?? null);
  const donations = donationsData?.data ?? [];

  return (
    <SideDrawer open={open} onClose={onClose} title={donor?.displayName ?? "Donor Detail"}>
      {!donor ? null : (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Churn Risk Score</span>
              <span className="text-lg font-bold text-gray-900">
                {donor.churnRiskScore != null ? `${(donor.churnRiskScore * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Risk Band</span>
              <BandBadge band={donor.churnBand} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Lifetime Value</span>
              <span className="text-sm font-semibold text-gray-900">{fmtPeso(donor.totalDonationsPhp)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Last Donation</span>
              <span className="text-sm text-gray-700">{fmtDate(donor.lastDonationDate)}</span>
            </div>
            {donor.churnScoreUpdatedAt && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Score Updated</span>
                <span className="text-xs text-gray-400">{fmtRelativeDate(donor.churnScoreUpdatedAt)}</span>
              </div>
            )}
          </div>

          {donor.churnTopDrivers && donor.churnTopDrivers.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Drivers</div>
              <div className="space-y-1.5">
                {donor.churnTopDrivers.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{d.label}</span>
                    <span className="font-semibold text-gray-900">{(d.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Action</div>
            <div className="flex gap-2 flex-wrap">
              <ActionButton
                label="Send Email"
                onClick={() => onAction(donor.supporterId, "send-email")}
                disabled={isPending}
                variant={donor.churnRecommendedAction === "send-email" ? "primary" : "default"}
              />
              <ActionButton
                label="Schedule Call"
                onClick={() => onAction(donor.supporterId, "schedule-call")}
                disabled={isPending}
                variant={donor.churnRecommendedAction === "schedule-call" ? "primary" : "default"}
              />
              <ActionButton
                label="No Action"
                onClick={() => onAction(donor.supporterId, "none")}
                disabled={isPending}
                variant={donor.churnRecommendedAction === "none" ? "primary" : "default"}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Donations</div>
            {isLoading ? (
              <LoadingState label="Loading donations…" />
            ) : donations.length === 0 ? (
              <EmptyState label="No recent donations" />
            ) : (
              <div className="space-y-2">
                {donations.map(d => (
                  <div key={d.donationId} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">{fmtPeso(d.amount)}</div>
                      <div className="text-gray-400">{fmtDate(d.donationDate)} · {d.channel ?? "—"}</div>
                    </div>
                    {d.attributedOutcomeScore != null && (
                      <span className="text-gray-500">
                        Impact: <span className="font-semibold text-[#2a9d72]">{(d.attributedOutcomeScore * 100).toFixed(0)}%</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </SideDrawer>
  );
}

// ── Upgrade Tab ───────────────────────────────────────────────────────────────

function UpgradeTab() {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState("90d");
  const [upgradeBand, setUpgradeBand] = useState("");
  const [selectedDonor, setSelectedDonor] = useState<DonorUpgradeItem | null>(null);

  const { data, isLoading, error, refetch } = useGetDonorUpgrade({
    page, pageSize: 15, dateRange, upgradeBand: upgradeBand || undefined,
  });
  const patchDonor = usePatchDonorAction();

  const donors = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <PipelineInterpretationNotice
        title="Directional ask guidance"
        body="Recommended ask bands are useful for prioritization, but any adjacent next-donation forecasting context should still be treated as directional until regression validation and leakage checks are stronger."
        tone="critical"
      />

      <Card>
        <SectionHeader
          title="Upgrade Potential Board"
          sub="Supporters with high likelihood of increasing their giving tier"
          action={
            <div className="flex items-center gap-2">
              <DateRangeSelector value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} />
              <FilterSelect
                value={upgradeBand}
                onChange={v => { setUpgradeBand(v); setPage(1); }}
                options={UPGRADE_BAND_OPTS}
                placeholder="All bands"
              />
            </div>
          }
        />

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : donors.length === 0 ? (
          <EmptyState label="No upgrade candidates found" />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Supporter", "Upgrade Score", "Band", "Avg Gift", "Recommended Ask", "Lifetime Value", ""].map((h, i) => (
                      <th key={i} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {donors.map(d => (
                    <tr key={d.supporterId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-gray-900">{d.displayName}</div>
                        <div className="text-xs text-gray-400">{d.email}</div>
                      </td>
                      <td className="py-2.5 pr-4 w-36">
                        <div className="space-y-0.5">
                          <ScoreBar score={d.upgradeLikelihoodScore} />
                          <div className="text-[10px] text-gray-400">Raw: {fmtModelScore(d.upgradeLikelihoodScore)}</div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <BandBadge band={d.upgradeBand} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs font-medium text-gray-700">
                        {fmtPeso(d.avgDonationPhp)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {d.upgradeRecommendedAskBand ? (
                          <span className="text-xs text-gray-600 bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                            {d.upgradeRecommendedAskBand.replace(/-/g, " ")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs font-medium text-gray-700">
                        {fmtPeso(d.totalDonationsPhp)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedDonor(prev => prev?.supporterId === d.supporterId ? null : d)}
                          className="text-xs text-[#2a9d72] hover:text-[#0e2118] font-medium flex items-center gap-1 ml-auto"
                        >
                          <ExternalLink className="w-3 h-3" /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && <Pagination page={page} total={meta.total} pageSize={15} onChange={setPage} />}
          </>
        )}
      </Card>

      <SideDrawer
        open={selectedDonor !== null}
        onClose={() => setSelectedDonor(null)}
        title={selectedDonor?.displayName ?? "Donor Detail"}
      >
        {selectedDonor && (
          <div className="space-y-5">
            <div className="space-y-3">
              {[
                { label: "Upgrade Score", value: selectedDonor.upgradeLikelihoodScore != null ? `${(selectedDonor.upgradeLikelihoodScore * 100).toFixed(1)}%` : "—" },
                { label: "Upgrade Band", value: <BandBadge band={selectedDonor.upgradeBand} /> },
                { label: "Recommended Ask", value: selectedDonor.upgradeRecommendedAskBand?.replace(/-/g, " ") ?? "—" },
                { label: "Avg Gift", value: fmtPeso(selectedDonor.avgDonationPhp) },
                { label: "Lifetime Value", value: fmtPeso(selectedDonor.totalDonationsPhp) },
                { label: "Last Donation", value: fmtDate(selectedDonor.lastDonationDate) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-sm text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            {selectedDonor.upgradeTopDrivers && selectedDonor.upgradeTopDrivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upgrade Signals</div>
                <div className="space-y-1.5">
                  {selectedDonor.upgradeTopDrivers.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{d.label}</span>
                      <span className="font-semibold text-[#2a9d72]">{(d.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action</div>
              <ActionButton
                label="Mark Not Ready"
                onClick={() => patchDonor.mutate({ id: selectedDonor.supporterId, body: { upgradeBand: "not-ready" } })}
                disabled={patchDonor.isPending}
                variant="danger"
              />
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MLDonorsPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const defaultTab = (params.get("tab") as Tab) || "supporters";
  const [tab, setTab] = useState<Tab>(["supporters", "churn", "upgrade"].includes(defaultTab) ? defaultTab : "supporters");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [tab]);

  const coverageByTab: Record<Tab, { title: string; subtitle: string; pipelines: string[] }> = {
    supporters: {
      title: "Supporter Management",
      subtitle: "View complete supporter profiles, donation history, and maintain supporter records from this route.",
      pipelines: [],
    },
    churn: {
      title: "Churn Coverage",
      subtitle: "This route is the direct UI surface for donor retention scoring.",
      pipelines: ["donor_retention"],
    },
    upgrade: {
      title: "Upgrade Coverage",
      subtitle: "This route is the direct UI surface for donor upgrade, with next-donation forecasting used as adjacent context.",
      pipelines: ["donor_upgrade", "next_donation_amount"],
    },
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supporters & Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage supporter records and donation history, with routed ML views for retention and upgrade
        </p>
      </div>

      <TabBar<Tab> tabs={TABS} active={tab} onChange={(next) => setTab(next)} />

      {tab !== "supporters" && (
        <PipelineCoveragePanel
          title={coverageByTab[tab].title}
          subtitle={coverageByTab[tab].subtitle}
          pipelineNames={coverageByTab[tab].pipelines}
        />
      )}

      {tab === "supporters" && <SupporterManagementPanel />}
      {tab === "churn" && <ChurnTab />}
      {tab === "upgrade" && <UpgradeTab />}
    </div>
  );
}
