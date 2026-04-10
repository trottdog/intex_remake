import { type ReactNode } from "react";
import { Building2, CalendarDays, Heart, Loader2, Mail, MapPin, Package, Phone, Wallet, X } from "lucide-react";
import { useGetSupporterProfile, type Supporter, type SupporterDonationHistoryItem } from "@/services/supporters.service";

interface SupporterProfileDrawerProps {
  open: boolean;
  supporterId: number | null;
  onClose: () => void;
  onEdit?: (supporter: Supporter) => void;
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

function supporterName(displayName?: string | null, firstName?: string | null, lastName?: string | null, organizationName?: string | null) {
  return displayName || `${firstName ?? ""} ${lastName ?? ""}`.trim() || organizationName || "Supporter";
}

export function SupporterProfileDrawer({
  open,
  supporterId,
  onClose,
  onEdit,
}: SupporterProfileDrawerProps) {
  const { data, isLoading, error } = useGetSupporterProfile(open ? supporterId : null);

  if (!open) return null;

  const supporter = data?.supporter;
  const name = supporterName(supporter?.displayName, supporter?.firstName, supporter?.lastName, supporter?.organizationName);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl border-l border-gray-200 bg-white shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#2a9d72]">Supporter Profile</div>
              <h2 className="mt-1 text-xl font-bold text-gray-900">{name}</h2>
              <div className="mt-1 text-sm text-gray-500">{supporter?.supporterType ?? "Supporter"}</div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && supporter && (
                <button
                  onClick={() => onEdit(supporter)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              )}
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#2a9d72]" />
            </div>
          ) : error || !data || !supporter ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
              Failed to load the supporter profile.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={supporter.email ?? "—"} />
                <InfoCard icon={<Phone className="w-4 h-4" />} label="Phone" value={supporter.phone ?? "—"} />
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Region" value={supporter.region ?? "—"} />
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Country" value={supporter.country ?? "—"} />
                <InfoCard icon={<Building2 className="w-4 h-4" />} label="Organization" value={supporter.organizationName ?? "—"} />
                <InfoCard icon={<CalendarDays className="w-4 h-4" />} label="First Donation" value={fmtDate(supporter.firstDonationDate ?? supporter.donorSince)} />
              </section>

              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Lifetime Giving" value={fmtPeso(supporter.lifetimeGiving)} />
                <MetricCard label="Donation Count" value={String(supporter.donationCount ?? data.givingStats.count ?? 0)} />
                <MetricCard label="Average Gift" value={fmtPeso(data.givingStats.avgGiftAmount ?? data.givingStats.avgGift)} />
                <MetricCard label="Last Gift" value={fmtDate(supporter.lastGiftDate ?? data.givingStats.lastDonationDate)} />
              </section>

              <section className="rounded-2xl border border-gray-100 bg-[#f8faf9] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Heart className="w-4 h-4 text-[#2a9d72]" />
                  Supporter Details
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <DetailRow label="Status" value={supporter.status ?? "—"} />
                  <DetailRow label="Relationship Type" value={supporter.relationshipType ?? "—"} />
                  <DetailRow label="Acquisition Channel" value={supporter.acquisitionChannel ?? "—"} />
                  <DetailRow label="Recurring Enabled" value={(supporter.recurringEnabled || supporter.hasRecurring) ? "Yes" : "No"} />
                  <DetailRow label="Created At" value={fmtDate(supporter.createdAt)} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <Wallet className="w-4 h-4" />
                  Donation History
                </div>
                <div className="mt-3 space-y-4">
                  {data.donationHistory.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-6 text-sm text-gray-400">
                      No donations have been recorded for this supporter yet.
                    </div>
                  ) : data.donationHistory.map((donation) => (
                    <DonationHistoryCard key={donation.donationId} donation={donation} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <span className="text-[#2a9d72]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-800 break-words">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-2 text-lg font-bold text-[#0e2118]">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

function DonationHistoryCard({ donation }: { donation: SupporterDonationHistoryItem }) {
  const baseAmount = donation.amount ?? donation.estimatedValue ?? 0;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-gray-900">
            Donation #{donation.donationId} · {donation.donationType ?? "Donation"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {fmtDate(donation.donationDate)} · {donation.channelSource ?? "—"} · {donation.campaignName ?? (donation.isGeneralFund ? "General Fund" : donation.safehouseName ?? "Directed Gift")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#2a9d72]">{fmtPeso(baseAmount)}</div>
          <div className="text-xs text-gray-500">
            Allocated {fmtPeso(donation.totalAllocated)}{donation.unallocated != null ? ` · Remaining ${fmtPeso(donation.unallocated)}` : ""}
          </div>
        </div>
      </div>

      {donation.notes && (
        <div className="mt-3 rounded-xl bg-[#f8faf9] px-4 py-3 text-sm text-gray-600">
          {donation.notes}
        </div>
      )}

      {donation.allocations.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Allocations</div>
          <div className="mt-2 space-y-2">
            {donation.allocations.map((allocation) => (
              <div key={allocation.allocationId} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{allocation.programArea ?? "Program Area"}</div>
                  <div className="text-xs text-gray-500">
                    {allocation.safehouseName ?? "No safehouse"} · {fmtDate(allocation.allocationDate)}
                  </div>
                  {allocation.allocationNotes && (
                    <div className="text-xs text-gray-400 mt-1">{allocation.allocationNotes}</div>
                  )}
                </div>
                <div className="text-sm font-bold text-[#0e2118]">{fmtPeso(allocation.amountAllocated)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {donation.inKindItems.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Package className="w-3.5 h-3.5" />
            In-Kind Items
          </div>
          <div className="mt-2 space-y-2">
            {donation.inKindItems.map((item) => (
              <div key={item.itemId} className="rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-800">{item.itemName ?? "Item"}</div>
                  <div className="text-sm font-bold text-gray-700">
                    {item.quantity ?? 0} {item.unitOfMeasure ?? ""}
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {item.itemCategory ?? "—"} · {item.intendedUse ?? "—"} · {item.receivedCondition ?? "—"}
                </div>
                {item.estimatedUnitValue != null && (
                  <div className="mt-1 text-xs text-gray-400">Estimated unit value: {fmtPeso(item.estimatedUnitValue)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
