import { useState, useEffect } from "react";
import { X, Heart, Loader2, CheckCircle, RefreshCw, Building2, Globe, ChevronRight, ChevronLeft } from "lucide-react";
import { useGiveDonation } from "@/services/donations.service";
import { triggerDonationConfetti } from "@/lib/confetti";
import { apiFetch } from "@/services/api";

const PRESETS = [500, 1000, 2500, 5000];

interface Safehouse { safehouseId: number; safehouseName: string | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRecurring?: boolean;
}

export function QuickDonateModal({ open, onClose, defaultRecurring = false }: Props) {
  const [step, setStep] = useState<"destination" | "amount">("destination");
  const [destination, setDestination] = useState<"general" | number>("general");
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [amount, setAmount] = useState<number | "">("");
  const [custom, setCustom] = useState("");
  const [isRecurring, setIsRecurring] = useState(defaultRecurring);
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const { mutate: give, isPending } = useGiveDonation();

  useEffect(() => {
    if (open) {
      apiFetch<{ data: Safehouse[] }>("/api/public/safehouses").then(d => setSafehouses(d.data ?? [])).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const effectiveAmount = amount !== "" ? amount : (custom ? parseFloat(custom) : 0);
  const selectedSafehouse = destination !== "general" ? safehouses.find(s => s.safehouseId === destination) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveAmount || effectiveAmount <= 0) return;
    triggerDonationConfetti();
    give(
      {
        amount: effectiveAmount,
        isRecurring,
        notes: notes || undefined,
        safehouseId: destination !== "general" ? (destination as number) : undefined,
      },
      {
        onSuccess: (data: { message?: string }) => {
          setSuccess(data?.message ?? "Thank you for your donation!");
        },
        onError: () => {
          setSuccess("Something went wrong. Please try again.");
        },
      }
    );
  }

  function handleClose() {
    setStep("destination");
    setDestination("general");
    setAmount("");
    setCustom("");
    setIsRecurring(defaultRecurring);
    setNotes("");
    setSuccess(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="bg-gradient-to-br from-[#f0faf5] to-[#e8f5ee] px-6 pt-6 pb-5 border-b border-[#c8e6d4]">
          <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-[#2a9d72]" />
            <span className="text-[#2a9d72] text-xs font-semibold uppercase tracking-wide">Quick Donate</span>
          </div>
          <h2 className="text-xl font-black text-[#0e2118]">Make a Donation</h2>
          <p className="text-gray-500 text-sm mt-1">Every peso shelters, heals, and restores a life in the Philippines.</p>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle className="w-12 h-12 text-[#2a9d72] mx-auto mb-3" />
            <p className="font-bold text-[#0e2118] text-base mb-1">Donation recorded!</p>
            <p className="text-gray-500 text-sm leading-relaxed">{success}</p>
            <button onClick={handleClose} className="mt-6 px-6 py-2.5 bg-[#2a9d72] text-white rounded-xl font-semibold text-sm hover:bg-[#23856a] transition-colors">Done</button>
          </div>

        ) : step === "destination" ? (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Where should your gift go?</p>

            <button type="button" onClick={() => setDestination("general")}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${destination === "general" ? "border-[#2a9d72] bg-[#f0faf6]" : "border-gray-200 hover:border-gray-300"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${destination === "general" ? "bg-[#2a9d72]" : "bg-gray-100"}`}>
                  <Globe className={`w-4 h-4 ${destination === "general" ? "text-white" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="font-bold text-[#0e2118] text-sm">General Fund</p>
                  <p className="text-xs text-gray-500">Allocated by our team where it's needed most</p>
                </div>
                {destination === "general" && <CheckCircle className="w-4 h-4 text-[#2a9d72] ml-auto shrink-0" />}
              </div>
            </button>

            {safehouses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Or choose a safehouse</p>
                <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                  {safehouses.map(s => (
                    <button key={s.safehouseId} type="button" onClick={() => setDestination(s.safehouseId)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${destination === s.safehouseId ? "border-[#2a9d72] bg-[#f0faf6]" : "border-gray-200 hover:border-gray-300"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${destination === s.safehouseId ? "bg-[#2a9d72]" : "bg-gray-100"}`}>
                          <Building2 className={`w-4 h-4 ${destination === s.safehouseId ? "text-white" : "text-gray-400"}`} />
                        </div>
                        <p className="font-semibold text-[#0e2118] text-sm">{s.safehouseName ?? `Safehouse #${s.safehouseId}`}</p>
                        {destination === s.safehouseId && <CheckCircle className="w-4 h-4 text-[#2a9d72] ml-auto shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setStep("amount")}
              className="w-full py-3 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] transition-colors flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-2 p-2.5 bg-[#f0faf6] border border-[#c8e6d4] rounded-xl">
              <button type="button" onClick={() => setStep("destination")} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {destination === "general" ? <Globe className="w-4 h-4 text-[#2a9d72]" /> : <Building2 className="w-4 h-4 text-[#2a9d72]" />}
              <span className="text-sm font-semibold text-[#0e2118]">
                {destination === "general" ? "General Fund" : (selectedSafehouse?.safehouseName ?? "Safehouse")}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select amount</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESETS.map(p => (
                  <button key={p} type="button" onClick={() => { setAmount(p); setCustom(""); }}
                    className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                      amount === p ? "bg-[#2a9d72] text-white border-[#2a9d72]" : "bg-white border-gray-200 text-gray-700 hover:border-[#2a9d72] hover:text-[#2a9d72]"
                    }`}>₱{p.toLocaleString()}</button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₱</span>
                <input type="number" min="1" placeholder="Custom amount" value={custom}
                  onChange={e => { setCustom(e.target.value); setAmount(""); }}
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]" />
              </div>
            </div>

            <div className="bg-[#f8faf9] border border-[#c8e6d4] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#2a9d72]" />
                <div>
                  <div className="text-sm font-semibold text-[#0e2118]">Monthly recurring</div>
                  <div className="text-xs text-gray-400">Donate this amount every month automatically</div>
                </div>
              </div>
              <button type="button" onClick={() => setIsRecurring(r => !r)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isRecurring ? "bg-[#2a9d72]" : "bg-gray-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isRecurring ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Message (optional)</label>
              <textarea rows={2} placeholder="A message of encouragement..." value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]" />
            </div>

            <button type="submit" disabled={isPending || !effectiveAmount || effectiveAmount <= 0}
              className="w-full py-3 bg-[#2a9d72] text-white rounded-xl font-bold text-sm hover:bg-[#23856a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                : <><Heart className="w-4 h-4" /> {isRecurring ? "Give Monthly" : "Give Now"} {effectiveAmount > 0 ? `· ₱${Number(effectiveAmount).toLocaleString()}` : ""}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
