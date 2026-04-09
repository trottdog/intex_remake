import { useState } from "react";
import {
  useListCampaigns, useDonateToCampaign,
  type Campaign,
} from "@/services/campaigns.service";
import { Target, Clock, CheckCircle, Heart, Loader2, AlertTriangle, X, DollarSign } from "lucide-react";
import { triggerDonationConfetti } from "@/lib/confetti";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className="bg-[#2a9d72] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "No deadline";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-[#2a9d72]/10 text-[#2a9d72]",
    completed: "bg-gray-100 text-gray-500",
    draft: "bg-amber-50 text-amber-600",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ── DONATE MODAL ─────────────────────────────────────────────────────────────
function DonateModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const donate = useDonateToCampaign();

  const presets = [500, 1000, 2500, 5000];
  const remaining = campaign.goal ? Math.max(campaign.goal - campaign.totalRaised, 0) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setError("Please enter a valid amount."); return; }

    triggerDonationConfetti();
    try {
      const result = await donate.mutateAsync({
        campaignId: campaign.campaignId,
        amount: parsed,
        currencyCode: "PHP",
        channelSource: "online",
        notes: notes || undefined,
      });
      setSuccess(result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to process donation. Please try again.";
      setError(msg);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#f0faf5] to-[#e8f5ee] border-b border-[#c8e6d4] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-[#2a9d72]" />
                <span className="text-[#2a9d72] text-xs font-bold uppercase tracking-wider">Donate to Campaign</span>
              </div>
              <h2 className="font-bold text-[#0e2118] text-base leading-snug">{campaign.title}</h2>
              {campaign.category && (
                <span className="text-xs text-gray-500 mt-0.5 block">{campaign.category}</span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          {campaign.goal && (
            <div className="mt-4">
              <ProgressBar value={campaign.totalRaised} max={campaign.goal} />
              <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                <span className="font-semibold text-[#0e2118]">₱{campaign.totalRaised.toLocaleString()} raised</span>
                <span>of ₱{campaign.goal.toLocaleString()} goal</span>
              </div>
              {remaining !== null && remaining > 0 && (
                <p className="text-xs text-gray-400 mt-1">₱{remaining.toLocaleString()} still needed</p>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#2a9d72]/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-[#2a9d72]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Donation Recorded!</h3>
              <p className="text-sm text-gray-500">{success}</p>
              <button
                onClick={onClose}
                className="mt-5 w-full bg-[#0e2118] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3a28] transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick presets */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Quick Amount (PHP)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {presets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(String(p))}
                      className={`py-2 text-sm font-semibold rounded-lg border transition-colors ${
                        amount === String(p)
                          ? "bg-[#0e2118] text-white border-[#0e2118]"
                          : "border-gray-200 text-gray-700 hover:border-[#2a9d72] hover:text-[#2a9d72]"
                      }`}
                    >
                      ₱{p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Custom Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₱</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Leave a message with your donation..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={donate.isPending || !amount}
                className="w-full flex items-center justify-center gap-2 bg-[#0e2118] hover:bg-[#1a3a28] disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-colors"
              >
                {donate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className="w-4 h-4" />
                )}
                {donate.isPending ? "Processing..." : `Give ₱${parseFloat(amount || "0").toLocaleString() || "—"}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CAMPAIGN CARD ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onGive }: { campaign: Campaign; onGive: (c: Campaign) => void }) {
  const pct = campaign.goal && campaign.goal > 0
    ? Math.min(Math.round((campaign.totalRaised / campaign.goal) * 100), 100)
    : 0;
  const remaining = campaign.goal ? Math.max(campaign.goal - campaign.totalRaised, 0) : null;
  const isCompleted = campaign.status === "completed";

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-shadow hover:shadow-md ${isCompleted ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {campaign.category && (
              <span className="text-xs font-medium text-[#2a9d72] bg-[#2a9d72]/10 px-2 py-0.5 rounded-full">
                {campaign.category}
              </span>
            )}
            <StatusBadge status={campaign.status} />
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{campaign.title}</h3>
        </div>
        {campaign.deadline && !isCompleted && (
          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full shrink-0">
            <Clock className="w-3 h-3" />
            {fmtDate(campaign.deadline)}
          </div>
        )}
      </div>

      {campaign.description && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{campaign.description}</p>
      )}

      {campaign.goal && campaign.goal > 0 ? (
        <>
          <ProgressBar value={campaign.totalRaised} max={campaign.goal} />
          <div className="flex items-center justify-between mt-2 mb-1">
            <div>
              <span className="text-lg font-bold text-gray-900">₱{campaign.totalRaised.toLocaleString()}</span>
              <span className="text-sm text-gray-400"> of ₱{campaign.goal.toLocaleString()}</span>
            </div>
            <span className="text-sm font-semibold text-[#2a9d72]">{pct}%</span>
          </div>
          <div className="flex items-center justify-between mt-1 mb-4">
            <p className="text-xs text-gray-400">
              {isCompleted
                ? `Fully funded — ${campaign.donorCount} donor${campaign.donorCount !== 1 ? "s" : ""}`
                : `₱${remaining?.toLocaleString()} still needed · ${campaign.donorCount} donor${campaign.donorCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </>
      ) : (
        <div className="mb-4">
          <p className="text-xs text-gray-400">
            ₱{campaign.totalRaised.toLocaleString()} raised · {campaign.donorCount} donor{campaign.donorCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {!isCompleted ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <DollarSign className="w-3.5 h-3.5" />
            PHP · Online giving
          </div>
          <button
            onClick={() => onGive(campaign)}
            className="flex items-center gap-1.5 bg-[#0e2118] hover:bg-[#1a3a28] text-white text-sm px-5 py-2 rounded-xl font-semibold transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            Give Now
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="font-semibold">Goal Reached — Thank you!</span>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const { data, isLoading, error } = useListCampaigns();
  const [donatingTo, setDonatingTo] = useState<Campaign | null>(null);

  const campaigns = data?.data ?? [];
  const active = campaigns.filter(c => c.status === "active");
  const completed = campaigns.filter(c => c.status === "completed");
  const draft = campaigns.filter(c => c.status === "draft");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Join targeted campaigns to maximize the impact of your giving.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-[#2a9d72]" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4" />
          Could not load campaigns. Please refresh the page.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[#2a9d72]" />
                Active Campaigns
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{active.length}</span>
              </h2>
              <div className="grid gap-5">
                {active.map(c => (
                  <CampaignCard key={c.campaignId} campaign={c} onGive={setDonatingTo} />
                ))}
              </div>
            </div>
          )}

          {draft.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-amber-500" />
                Upcoming Campaigns
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{draft.length}</span>
              </h2>
              <div className="grid gap-5">
                {draft.map(c => (
                  <CampaignCard key={c.campaignId} campaign={c} onGive={setDonatingTo} />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Completed Campaigns
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{completed.length}</span>
              </h2>
              <div className="grid gap-5">
                {completed.map(c => (
                  <CampaignCard key={c.campaignId} campaign={c} onGive={setDonatingTo} />
                ))}
              </div>
            </div>
          )}

          {campaigns.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <Target className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No campaigns are currently active.</p>
              <p className="text-gray-300 text-xs mt-1">Check back soon for new fundraising campaigns.</p>
            </div>
          )}
        </>
      )}

      {donatingTo && (
        <DonateModal campaign={donatingTo} onClose={() => setDonatingTo(null)} />
      )}
    </div>
  );
}
