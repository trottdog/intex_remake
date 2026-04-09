import { useState } from "react";
import { useQueryPagination } from "@/hooks/useQueryPagination";
import { useGetMyDonationLedger, useGetRecurringStatus, type Donation } from "@/services/donations.service";
import { DollarSign, Loader2, Heart, Package, ChevronLeft, ChevronRight, TrendingUp, Calendar, Hash, RefreshCw } from "lucide-react";
import { QuickDonateModal } from "@/components/donor/QuickDonateModal";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function DonationTypeIcon({ type }: { type?: string | null }) {
  if (type === "in_kind") return <Package className="w-4 h-4 text-[#457b9d]" />;
  return <DollarSign className="w-4 h-4 text-[#2a9d72]" />;
}

function DonationTypeBadge({ type }: { type?: string | null }) {
  const styles: Record<string, string> = {
    monetary: "bg-[#2a9d72]/10 text-[#2a9d72]",
    in_kind: "bg-[#457b9d]/10 text-[#457b9d]",
  };
  const label: Record<string, string> = { monetary: "Monetary", in_kind: "In-Kind" };
  const t = type ?? "monetary";
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${styles[t] ?? "bg-gray-100 text-gray-600"}`}>
      {label[t] ?? t}
    </span>
  );
}

function SummaryKpi({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <div className="text-base font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function GivingHistoryPage() {
  const { page, setPage } = useQueryPagination();
  const { data, isLoading } = useGetMyDonationLedger();
  const { data: recurringData } = useGetRecurringStatus();
  const [donateOpen, setDonateOpen] = useState(false);

  const donations = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageSize = 20;
  const pageCount = Math.ceil(total / pageSize);

  const totalAmount = donations.reduce((s, d) => s + Number(d.amount ?? 0), 0);
  const campaigns = [...new Set(donations.map(d => d.campaignName ?? d.campaign).filter(Boolean))];
  const lastDonation = donations[0];

  return (
    <div className="space-y-6">

      <QuickDonateModal open={donateOpen} onClose={() => setDonateOpen(false)} defaultRecurring={recurringData?.recurringEnabled ?? false} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giving History</h1>
          <p className="text-sm text-gray-500 mt-1">Your complete donation ledger — every contribution on record.</p>
        </div>
        <button
          onClick={() => setDonateOpen(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] transition-colors shadow-sm"
        >
          <Heart className="w-4 h-4" />
          Donate Now
        </button>
      </div>

      {!isLoading && donations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryKpi icon={DollarSign} label="Total Contributed" value={`₱${totalAmount.toLocaleString()}`} color="#2a9d72" />
          <SummaryKpi icon={Hash} label="Donations Made" value={String(total)} color="#457b9d" />
          <SummaryKpi icon={Heart} label="Campaigns Supported" value={String(campaigns.length)} color="#e76f51" />
          <SummaryKpi icon={Calendar} label="Most Recent" value={fmtDate(lastDonation?.donationDate)} color="#e9c46a" />
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Donation Ledger</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {total > 0 ? `${total} record${total !== 1 ? "s" : ""} found` : "No donations yet"}
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-gray-300" />
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#2a9d72]" />
          </div>
        ) : donations.length === 0 ? (
          <div className="py-16 text-center">
            <Heart className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <div className="text-gray-400 text-sm font-medium">No donation history yet</div>
            <div className="text-gray-300 text-xs mt-1">Your contributions will appear here</div>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Type</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Campaign</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Channel</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Recurring</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Amount</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wide">Currency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map((d: Donation, i: number) => (
                    <tr key={d.donationId ?? d.id ?? i} className="hover:bg-[#f8faf9] transition-colors">
                      <td className="px-6 py-4 text-gray-600 text-sm">{fmtDate(d.donationDate)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DonationTypeIcon type={d.donationType} />
                          <DonationTypeBadge type={d.donationType} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium text-sm">
                        {d.campaignName ?? d.campaign ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs capitalize">
                        {d.channelSource ?? "direct"}
                      </td>
                      <td className="px-6 py-4">
                        {d.isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2a9d72]/10 text-[#2a9d72]">
                            <RefreshCw className="w-3 h-3" />
                            Monthly
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {d.amount ? (
                          <span className="text-sm font-bold text-[#0e2118]">₱{Number(d.amount).toLocaleString()}</span>
                        ) : d.estimatedValue ? (
                          <span className="text-sm font-bold text-[#457b9d]">~₱{Number(d.estimatedValue).toLocaleString()}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {d.currencyCode ?? d.currency ?? "PHP"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-50">
              {donations.map((d: Donation, i: number) => (
                <div key={d.donationId ?? d.id ?? i} className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <DonationTypeIcon type={d.donationType} />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {d.campaignName ?? d.campaign ?? "General Donation"}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDate(d.donationDate)}</div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-sm font-bold text-[#0e2118]">
                      ₱{Number(d.amount ?? d.estimatedValue ?? 0).toLocaleString()}
                    </div>
                    <DonationTypeBadge type={d.donationType} />
                    {d.isRecurring && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2a9d72]/10 text-[#2a9d72]">
                        <RefreshCw className="w-3 h-3" />
                        Monthly
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pageCount > 1 && (
              <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">Page {page} of {pageCount} · {total} total</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pageCount, page + 1))}
                    disabled={page >= pageCount}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
