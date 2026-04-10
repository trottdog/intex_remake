import { useState, useEffect, useMemo, useRef } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import handsImg from "@assets/Hands_Circle_1775623133974.jpg";
import { CheckCircle, Share2, Users, Package, Building2, Globe, ChevronRight, Eye, EyeOff } from "lucide-react";
import { triggerDonationConfetti } from "@/lib/confetti";
import { ApiError, apiFetch, apiPost } from "@/services/api";
import { registerDonorApi } from "@/services/auth.service";
import { createPublicInKindDonation, type PublicInKindDonationItemPayload } from "@/services/donations.service";

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const IMPACT_MAP: Record<number, { label: string; desc: string }> = {
  500:   { label: "₱500",    desc: "Provides school supplies for one child for a full month" },
  1000:  { label: "₱1,000",  desc: "Covers a week of nutritious meals for one resident" },
  2500:  { label: "₱2,500",  desc: "Funds one trauma counseling session with a licensed therapist" },
  5000:  { label: "₱5,000",  desc: "Supports one month of safe housing for a girl in need" },
  10000: { label: "₱10,000", desc: "Covers a full semester of education support for one resident" },
};

const FAQ = [
  {
    q: "Is my donation tax-deductible?",
    a: "Yes. Beacon Sanctuary PH is a registered nonprofit and all donations are eligible for tax deductions under Philippine BIR regulations. We will send you a BIR-compliant receipt.",
  },
  {
    q: "How is my donation used?",
    a: "100% of your gift goes directly to resident programs — shelter, food, counseling, and education. Our operational costs are covered separately by designated institutional grants.",
  },
  {
    q: "Can I donate monthly?",
    a: "Yes. Monthly giving is our most impactful option. It allows us to plan programs reliably and serve more girls. You can cancel at any time.",
  },
  {
    q: "Will I receive updates?",
    a: "Absolutely. Donors receive quarterly impact reports and occasional stories about the lives their gifts are changing — with full anonymization to protect our residents.",
  },
];

const OTHER_WAYS = [
  { Icon: Share2, title: "Spread the Word", desc: "Share Beacon on your social media. Every share reaches potential supporters who might never find us otherwise.", action: "Visit Our Socials", href: "/socials" },
  { Icon: Users, title: "Volunteer", desc: "Skilled professionals — counselors, teachers, medical workers — are always needed. Contact us to learn more.", action: "Contact Us", href: "mailto:info@beaconsanctuary.ph" },
  { Icon: Package, title: "In-Kind Donations", desc: "School supplies, clothes, hygiene products, and food items are always welcome at any of our safe homes.", action: "Learn How", href: "mailto:info@beaconsanctuary.ph" },
];

const PASSWORD_REQUIREMENTS = [
  { label: "At least 12 characters", test: (pw: string) => pw.length >= 12 },
  { label: "Uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "Number", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

interface Safehouse { safehouseId: number; safehouseName: string | null; }

export default function DonatePage() {
  const wantsAccountFromQuery = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("createAccount") === "1";
  const [step, setStep] = useState<"destination" | "form">("destination");
  const [destination, setDestination] = useState<"general" | number>("general");
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [safehousesLoading, setSafehousesLoading] = useState(true);
  const [safehousesError, setSafehousesError] = useState<string | null>(null);
  const [safehousesRetryToken, setSafehousesRetryToken] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(2500);
  const [donationMode, setDonationMode] = useState<"monetary" | "in-kind">("monetary");
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [inKindItems, setInKindItems] = useState<PublicInKindDonationItemPayload[]>([
    { itemName: "", quantity: 1, itemCategory: "", unitOfMeasure: "pcs", estimatedUnitValue: undefined, intendedUse: "", receivedCondition: "new" },
  ]);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [createAccount, setCreateAccount] = useState(wantsAccountFromQuery);
  const [accountForm, setAccountForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const thankYouRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    setSafehousesLoading(true);
    setSafehousesError(null);

    apiFetch<{ data: Safehouse[] }>("/api/public/safehouses")
      .then((response) => {
        if (cancelled) {
          return;
        }

        setSafehouses(response.data ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        console.error("Unable to load safehouses", error);
        setSafehouses([]);
        setSafehousesError("Unable to load safehouses right now. You can still continue with the General Fund.");
      })
      .finally(() => {
        if (!cancelled) {
          setSafehousesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [safehousesRetryToken]);

  useEffect(() => {
    if (!submitted || !thankYouRef.current) {
      return;
    }

    const scrollToThankYou = () => {
      const cardRect = thankYouRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const verticalPadding = 16;
      const canFullyFit = cardRect.height + verticalPadding * 2 <= viewportHeight;

      const centeredTop = window.scrollY + cardRect.top - (viewportHeight - cardRect.height) / 2;
      const topAligned = window.scrollY + cardRect.top - verticalPadding;
      const scrollTargetY = canFullyFit ? centeredTop : topAligned;

      window.scrollTo({
        top: Math.max(scrollTargetY, 0),
        behavior: "auto",
      });
    };

    requestAnimationFrame(() => requestAnimationFrame(scrollToThankYou));
  }, [submitted]);

  const finalAmount = selectedAmount ?? (customAmount ? parseInt(customAmount) : 0);
  const selectedSafehouse = destination !== "general" ? safehouses.find(s => s.safehouseId === destination) : null;
  const safehouseDisplayName = (safehouse: Safehouse) => safehouse.safehouseName ?? `Safehouse #${safehouse.safehouseId}`;
  const sortedSafehouses = useMemo(
    () =>
      [...safehouses].sort((a, b) => {
        const byName = safehouseDisplayName(a).localeCompare(safehouseDisplayName(b), undefined, {
          numeric: true,
          sensitivity: "base",
        });

        if (byName !== 0) {
          return byName;
        }

        return a.safehouseId - b.safehouseId;
      }),
    [safehouses],
  );
  const unmetPasswordRules = PASSWORD_REQUIREMENTS.filter((rule) => !rule.test(accountForm.password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!form.name || !form.email) return;
    if (donationMode === "monetary" && !finalAmount) return;
    if (donationMode === "in-kind") {
      const validItems = inKindItems.filter((item) => item.itemName.trim().length > 0);
      if (validItems.length === 0) {
        setSubmitError("Add at least one in-kind item.");
        return;
      }
      const invalidQuantity = validItems.find((item) => !Number.isFinite(item.quantity) || item.quantity <= 0);
      if (invalidQuantity) {
        setSubmitError(`Quantity must be greater than zero for "${invalidQuantity.itemName}".`);
        return;
      }
    }
    if (createAccount) {
      if (!accountForm.username.trim()) {
        setSubmitError("Username is required to create an account.");
        return;
      }
      if (unmetPasswordRules.length > 0) {
        setSubmitError("Password does not meet all account requirements.");
        return;
      }
      if (accountForm.password !== accountForm.confirmPassword) {
        setSubmitError("Password and confirmation do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      let supporterId: number | null = null;

      if (createAccount) {
        const fullNameParts = form.name.trim().split(/\s+/).filter(Boolean);
        const firstName = fullNameParts[0] ?? "Donor";
        const lastName = fullNameParts.slice(1).join(" ") || "Supporter";
        const account = await registerDonorApi({
          firstName,
          lastName,
          email: form.email,
          username: accountForm.username.trim(),
          password: accountForm.password,
        });
        supporterId = account.supporterId;
      }

      if (donationMode === "monetary") {
        await apiPost("/api/donations/public", {
          amount: finalAmount,
          name: form.name,
          email: form.email,
          notes: form.message || undefined,
          isRecurring: frequency === "monthly",
          safehouseId: destination !== "general" ? destination : null,
          supporterId,
        });
      } else {
        await createPublicInKindDonation({
          name: form.name,
          email: form.email,
          notes: form.message || undefined,
          safehouseId: destination !== "general" ? destination : null,
          supporterId,
          items: inKindItems
            .filter((item) => item.itemName.trim().length > 0)
            .map((item) => ({
              ...item,
              itemName: item.itemName.trim(),
              itemCategory: item.itemCategory?.trim() || undefined,
              unitOfMeasure: item.unitOfMeasure?.trim() || undefined,
              intendedUse: item.intendedUse?.trim() || undefined,
              receivedCondition: item.receivedCondition?.trim() || undefined,
              estimatedUnitValue: item.estimatedUnitValue ?? undefined,
            })),
        });
      }
      triggerDonationConfetti();
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Unable to process donation right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="relative bg-[#214636] py-20 px-6 overflow-hidden">
        <img src={`${import.meta.env.BASE_URL}donate-building.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Give Hope</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
            Your gift restores<br />
            <span className="text-[#2a9d72]">a whole life.</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Every peso you give provides safety, healing, and opportunity for a girl who has lost everything. This is where transformation begins.
          </p>
        </div>
      </section>

      {/* ── Donation Section ── */}
      <section className="py-20 px-6 bg-[#f9f9f7]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-10">
          <div className="md:col-span-3">
            {submitted ? (
              <div ref={thankYouRef} className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
                <div className="w-16 h-16 bg-[#f0faf6] rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-[#2a9d72]" />
                </div>
                <h2 className="text-2xl font-bold text-[#214636] mb-3">Thank you, {form.name.split(" ")[0]}!</h2>
                <p className="text-gray-600 mb-2">
                  {donationMode === "monetary"
                    ? <>Your {frequency === "monthly" ? "monthly" : "one-time"} gift of <strong>₱{finalAmount?.toLocaleString()}</strong> is making a real difference.</>
                    : <>Your in-kind donation has been recorded and queued for coordination with our logistics team.</>}
                </p>
                {selectedSafehouse && (
                  <p className="text-sm text-[#2a9d72] font-medium mb-2">
                    Directed to: {selectedSafehouse.safehouseName}
                  </p>
                )}
                {destination === "general" && (
                  <p className="text-sm text-gray-500 mb-2">Going to the General Fund — our team will allocate it where it's needed most.</p>
                )}
                <p className="text-gray-500 text-sm mb-8">A receipt and impact report will be sent to <strong>{form.email}</strong> within 24 hours.</p>
                {createAccount && (
                  <div className="mb-6 rounded-xl border border-[#c8e6d4] bg-[#f0faf6] px-4 py-4 text-sm text-[#214636]">
                    <p className="font-semibold">Account created successfully. Welcome to Beacon Sanctuary PH!</p>
                    <p className="mt-1 text-[#3f6a58]">You can log in whenever you are ready to view your donor account.</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (createAccount) {
                      window.location.href = "/login";
                      return;
                    }

                    setSubmitted(false);
                    setForm({ name: "", email: "", message: "" });
                    setDonationMode("monetary");
                    setSelectedAmount(2500);
                    setCustomAmount("");
                    setInKindItems([{ itemName: "", quantity: 1, itemCategory: "", unitOfMeasure: "pcs", estimatedUnitValue: undefined, intendedUse: "", receivedCondition: "new" }]);
                    setStep("destination");
                    setDestination("general");
                  }}
                  className="border-2 border-[#2a9d72] text-[#2a9d72] hover:bg-[#2a9d72] hover:text-white px-8 py-3 rounded-full font-semibold transition-colors"
                >{createAccount ? "Log In to Donate Again" : "Give Again"}</button>
              </div>
            ) : step === "destination" ? (
              /* ── Step 1: Choose Destination ── */
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#214636]">Where should your gift go?</h2>
                  <p className="text-sm text-gray-500 mt-1">You can direct your donation to the General Fund or to a specific safehouse.</p>
                </div>

                <div className="space-y-3">
                  {/* General Fund */}
                  <button
                    type="button"
                    onClick={() => setDestination("general")}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      destination === "general" ? "border-[#2a9d72] bg-[#f0faf6]" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${destination === "general" ? "bg-[#2a9d72]" : "bg-gray-100"}`}>
                        <Globe className={`w-5 h-5 ${destination === "general" ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="font-bold text-[#214636] text-sm">General Fund</div>
                        <div className="text-xs text-gray-500 mt-0.5">Our team will allocate your gift to where the need is greatest</div>
                      </div>
                      {destination === "general" && <CheckCircle className="w-5 h-5 text-[#2a9d72] ml-auto shrink-0" />}
                    </div>
                  </button>

                  {/* Safehouses */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Or choose a specific safehouse</p>
                    {safehousesLoading ? (
                      <div className="text-sm text-gray-400 text-center py-4">Loading safehouses...</div>
                    ) : safehousesError ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 space-y-3">
                        <p>{safehousesError}</p>
                        <button
                          type="button"
                          onClick={() => setSafehousesRetryToken((token) => token + 1)}
                          className="text-sm font-semibold text-[#214636] hover:underline"
                        >
                          Retry loading safehouses
                        </button>
                      </div>
                    ) : sortedSafehouses.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-4">No safehouses are available right now.</div>
                    ) : sortedSafehouses.map(s => (
                      <button
                        key={s.safehouseId}
                        type="button"
                        onClick={() => setDestination(s.safehouseId)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                          destination === s.safehouseId ? "border-[#2a9d72] bg-[#f0faf6]" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${destination === s.safehouseId ? "bg-[#2a9d72]" : "bg-gray-100"}`}>
                            <Building2 className={`w-5 h-5 ${destination === s.safehouseId ? "text-white" : "text-gray-400"}`} />
                          </div>
                          <div>
                            <div className="font-bold text-[#214636] text-sm">{safehouseDisplayName(s)}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Your full donation goes directly to this home</div>
                          </div>
                          {destination === s.safehouseId && <CheckCircle className="w-5 h-5 text-[#2a9d72] ml-auto shrink-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="w-full bg-[#2a9d72] hover:bg-[#248c64] text-white py-4 rounded-xl font-bold text-base transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              /* ── Step 2: Amount + Info ── */
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
                {/* Destination reminder */}
                <div className="flex items-center gap-3 p-3 bg-[#f0faf6] border border-[#c8e6d4] rounded-xl">
                  {destination === "general"
                    ? <Globe className="w-4 h-4 text-[#2a9d72] shrink-0" />
                    : <Building2 className="w-4 h-4 text-[#2a9d72] shrink-0" />}
                  <div className="text-sm">
                    <span className="font-semibold text-[#214636]">
                      {destination === "general" ? "General Fund" : (selectedSafehouse?.safehouseName ?? "Safehouse")}
                    </span>
                    <button type="button" onClick={() => setStep("destination")} className="ml-2 text-xs text-[#2a9d72] hover:underline">Change</button>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[#214636]">Make your donation</h2>

                {/* Donation mode */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Donation Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: "monetary", label: "Monetary Donation" },
                      { key: "in-kind", label: "In-Kind Donation" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDonationMode(opt.key)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                          donationMode === opt.key ? "bg-[#214636] border-[#214636] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                {donationMode === "monetary" && (
                  <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Giving Frequency</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["once", "monthly"] as const).map((f) => (
                      <button key={f} type="button" onClick={() => setFrequency(f)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                          frequency === f ? "bg-[#214636] border-[#214636] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}>{f === "once" ? "Give Once" : "Give Monthly"}</button>
                    ))}
                  </div>
                  {frequency === "monthly" && <p className="text-xs text-[#2a9d72] mt-2 font-medium">Monthly donors provide sustained support — the most impactful way to give.</p>}
                  </div>
                )}

                {/* Amount */}
                {donationMode === "monetary" ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Donation Amount (PHP)</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {PRESET_AMOUNTS.map((amt) => (
                        <button key={amt} type="button" onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                          className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                            selectedAmount === amt && !customAmount ? "bg-[#2a9d72] border-[#2a9d72] text-white" : "border-gray-200 text-gray-700 hover:border-[#2a9d72]"
                          }`}>₱{amt.toLocaleString()}</button>
                      ))}
                      <div onClick={() => setSelectedAmount(null)}
                        className={`col-span-3 border-2 rounded-xl px-3 py-2 flex items-center gap-2 transition-colors cursor-text ${customAmount ? "border-[#2a9d72]" : "border-gray-200"}`}>
                        <span className="text-gray-400 text-sm font-medium">₱</span>
                        <input type="number" min="100" placeholder="Custom amount" value={customAmount}
                          onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                          className="flex-1 outline-none text-sm text-gray-800 bg-transparent" />
                      </div>
                    </div>
                    {finalAmount > 0 && IMPACT_MAP[finalAmount] && (
                      <div className="bg-[#f0faf6] border border-[#2a9d72]/20 rounded-xl px-4 py-3 text-sm text-[#214636]">
                        <span className="font-semibold">Your impact: </span>{IMPACT_MAP[finalAmount].desc}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">In-Kind Items</label>
                      <button
                        type="button"
                        onClick={() => setInKindItems((items) => [...items, { itemName: "", quantity: 1, itemCategory: "", unitOfMeasure: "pcs", estimatedUnitValue: undefined, intendedUse: "", receivedCondition: "new" }])}
                        className="text-xs font-semibold text-[#2a9d72] hover:underline"
                      >
                        + Add item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {inKindItems.map((item, index) => (
                        <div key={`in-kind-${index}`} className="grid grid-cols-12 gap-2 bg-[#f9f9f7] border border-gray-100 rounded-xl p-3">
                          <input
                            className="col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Item name"
                            value={item.itemName}
                            onChange={(e) => setInKindItems((items) => items.map((it, i) => i === index ? { ...it, itemName: e.target.value } : it))}
                          />
                          <input
                            className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Qty"
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => setInKindItems((items) => items.map((it, i) => i === index ? { ...it, quantity: Number(e.target.value || 0) } : it))}
                          />
                          <input
                            className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Unit"
                            value={item.unitOfMeasure ?? ""}
                            onChange={(e) => setInKindItems((items) => items.map((it, i) => i === index ? { ...it, unitOfMeasure: e.target.value } : it))}
                          />
                          <input
                            className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Est. unit value"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimatedUnitValue ?? ""}
                            onChange={(e) => setInKindItems((items) => items.map((it, i) => i === index ? { ...it, estimatedUnitValue: e.target.value ? Number(e.target.value) : undefined } : it))}
                          />
                          <button
                            type="button"
                            className="col-span-2 text-xs text-red-500 hover:underline"
                            onClick={() => setInKindItems((items) => items.length === 1 ? items : items.filter((_, i) => i !== index))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personal Info */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Information</label>
                  <div className="space-y-3">
                    <input required type="text" placeholder="Full name" value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]" />
                    <input required type="email" placeholder="Email address" value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72]" />
                    <textarea placeholder="Leave a message of encouragement (optional)" rows={3} value={form.message}
                      onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] resize-none" />
                  </div>
                </div>

                <div className="rounded-xl border border-[#c8e6d4] bg-[#f0faf6] p-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2a9d72] focus:ring-[#2a9d72]"
                    />
                    <span className="text-sm text-[#214636]">
                      <span className="font-semibold">Create a donor account while donating</span>
                      <span className="block text-xs text-[#3f6a58] mt-1">Your account helps you track giving history and lets our team support you better.</span>
                    </span>
                  </label>

                  <p className="text-xs text-[#3f6a58]">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = "/login";
                      }}
                      className="font-semibold text-[#2a9d72] hover:underline"
                    >
                      Log in
                    </button>
                  </p>

                  {createAccount && (
                    <div className="space-y-3 pt-1">
                      <input
                        required={createAccount}
                        type="text"
                        placeholder="Choose a username"
                        value={accountForm.username}
                        onChange={(e) => setAccountForm((f) => ({ ...f, username: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white"
                      />
                      <div className="relative">
                        <input
                          required={createAccount}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={accountForm.password}
                          onChange={(e) => setAccountForm((f) => ({ ...f, password: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#214636] hover:text-[#2a9d72]"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          required={createAccount}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={accountForm.confirmPassword}
                          onChange={(e) => setAccountForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a9d72]/30 focus:border-[#2a9d72] bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#214636] hover:text-[#2a9d72]"
                          aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-[#3f6a58]">
                        Password requirements: {PASSWORD_REQUIREMENTS.map((rule) => rule.label).join(", ")}.
                      </p>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    !form.name
                    || !form.email
                    || submitting
                    || (donationMode === "monetary" && !finalAmount)
                  }
                  className="w-full bg-[#2a9d72] hover:bg-[#248c64] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base transition-colors shadow-md">
                  {submitting ? "Processing..." : donationMode === "monetary"
                    ? (finalAmount > 0
                      ? `Donate ₱${finalAmount.toLocaleString()}${frequency === "monthly" ? "/mo" : ""}`
                      : "Select an Amount")
                    : "Submit In-Kind Donation"}
                </button>
                <p className="text-center text-xs text-gray-400">Secure giving. Your information is never shared. You will receive a BIR receipt.</p>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl overflow-hidden h-48">
              <img src={handsImg} alt="Community" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#214636] rounded-2xl p-6 text-white">
              <div className="text-2xl font-bold text-[#2a9d72] mb-1">100%</div>
              <div className="font-semibold mb-2">Direct to Programs</div>
              <p className="text-white/60 text-sm leading-relaxed">Every peso you give funds shelter, food, counseling, and education directly. Our operational costs are covered by separate institutional grants.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Questions?</div>
            <h2 className="text-2xl font-bold text-[#214636]">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-[#214636] text-sm">{item.q}</span>
                  <span className={`text-[#2a9d72] text-lg transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && <div className="px-6 pb-5 bg-[#f9f9f7] text-sm text-gray-600 leading-relaxed">{item.a}</div>}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center text-sm text-gray-400">
            More questions? Email us at{" "}
            <a href="mailto:donations@beaconsanctuary.ph" className="text-[#2a9d72] font-medium hover:underline">donations@beaconsanctuary.ph</a>
          </div>
        </div>
      </section>

      {/* ── Other Ways ── */}
      <section className="bg-[#f9f9f7] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#214636]">Other ways to make a difference</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {OTHER_WAYS.map((item) => (
              <a key={item.title} href={item.href} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 bg-[#f0faf6] rounded-xl flex items-center justify-center mb-4">
                  <item.Icon className="w-5 h-5 text-[#2a9d72]" />
                </div>
                <h3 className="font-bold text-[#214636] mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                <span className="text-sm text-[#2a9d72] font-semibold group-hover:underline">{item.action} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
