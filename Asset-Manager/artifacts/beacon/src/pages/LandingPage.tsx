import { Link } from "wouter";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { useGetPublicImpact } from "@/services/public.service";
import { triggerDonationConfetti } from "@/lib/confetti";
import heroImg from "@assets/HoldingHandsAtBeach_1775623758874.jpg";
import jumpImg from "@assets/BackwardsJump-e1741389606772_1775623133972.jpg";
import circleImg from "@assets/GreenGrassFingerStar-e1741389539890_1775623133974.jpg";
import handsImg from "@assets/Hands_Circle_1775623133974.jpg";

const DONATION_AMOUNTS = [500, 1000, 2500, 5000];

const IMPACT_EQUIV: Record<number, string> = {
  500: "provides school supplies for one child for a month",
  1000: "covers a week of nutritious meals for one resident",
  2500: "funds a counseling session for a survivor",
  5000: "supports one month of safe housing for a girl in need",
};

const PHASES = [
  {
    num: "01",
    title: "Safety & Stabilization",
    body: "Girls arrive in crisis. We provide immediate shelter, security, and a warm household environment — so that healing can begin.",
  },
  {
    num: "02",
    title: "Healing & Growth",
    body: "Licensed counselors, educators, and mentors walk alongside each resident through trauma recovery, schooling, and skill development.",
  },
  {
    num: "03",
    title: "Reintegration & Independence",
    body: "When the time is right, we support safe family reunification or transition to independent living — with ongoing aftercare.",
  },
];

export default function LandingPage() {
  const { data: impact } = useGetPublicImpact();

  return (
    <PublicLayout>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Residents holding hands at the beach"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e2118]/85 via-[#0e2118]/60 to-transparent" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-36">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-[#2a9d72]/20 border border-[#2a9d72]/40 rounded-full px-4 py-1.5 text-[#4db88d] text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-[#2a9d72] rounded-full animate-pulse" />
              Nonprofit · Philippines
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Safe Spaces.<br />
              <span className="text-[#2a9d72]">Restored Lives.</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Beacon Sanctuary provides a safe home, healing, and hope for girls who have survived abuse and trafficking in the Philippines. Every donation restores a life.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/donate"
                className="bg-[#2a9d72] hover:bg-[#248c64] text-white px-8 py-3.5 rounded-full font-semibold text-base transition-colors shadow-lg"
              >
                Donate Today
              </Link>
              <Link
                href="/about"
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3.5 rounded-full font-semibold text-base transition-colors"
              >
                Learn Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Banner ───────────────────────────────────────────────── */}
      <section className="bg-[#f9f9f7] border-y border-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: impact?.residentsServedTotal ? `${impact.residentsServedTotal}+` : "500+", label: "Survivors Served" },
            { value: impact?.safehouseCount ? String(impact.safehouseCount) : "3", label: "Safe Homes" },
            { value: impact?.reintegrationCount ? String(impact.reintegrationCount) : "87", label: "Reintegrations" },
            { value: "12+", label: "Years of Service" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-bold text-[#0e2118]">{s.value}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who We Help ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Our Mission</div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0e2118] leading-tight mb-5">
                Every child deserves to feel safe, loved, and free.
              </h2>
              <p className="text-gray-600 leading-relaxed mb-5">
                Beacon Sanctuary operates safe homes across the Philippines for girls who have survived sexual abuse and trafficking. We provide emergency shelter, counseling, education, life skills training, and a path back to a dignified life.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                Our holistic care model addresses the physical, emotional, and social needs of every resident — because healing takes time, and these girls deserve more than just survival.
              </p>
              <Link
                href="/donate"
                className="inline-flex items-center gap-2 bg-[#0e2118] hover:bg-[#1a3a28] text-white px-7 py-3 rounded-full font-semibold transition-colors"
              >
                Support a Survivor
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <img
                src={circleImg}
                alt="Children playing together"
                className="rounded-2xl object-cover h-56 w-full"
              />
              <img
                src={handsImg}
                alt="Team unity"
                className="rounded-2xl object-cover h-56 w-full mt-6"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Donation CTA ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0e2118] to-[#1a3a28] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Make a Difference</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your gift changes everything.</h2>
          <p className="text-white/70 mb-10 max-w-xl mx-auto">
            100% of your donation goes directly to shelter, food, counseling, and education for the girls in our care.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {DONATION_AMOUNTS.map((amt) => (
              <Link
                key={amt}
                href={`/donate?amount=${amt}`}
                onClick={() => triggerDonationConfetti()}
                className="group bg-white/10 hover:bg-[#2a9d72] border border-white/20 hover:border-[#2a9d72] rounded-2xl p-5 transition-all cursor-pointer"
              >
                <div className="text-2xl font-bold text-white mb-1">₱{amt.toLocaleString()}</div>
                <div className="text-xs text-white/60 group-hover:text-white/80 leading-snug">
                  {IMPACT_EQUIV[amt]}
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/donate"
            onClick={() => triggerDonationConfetti()}
            className="inline-block bg-[#2a9d72] hover:bg-[#248c64] text-white px-10 py-4 rounded-full font-bold text-lg transition-colors shadow-xl"
          >
            Donate Now
          </Link>
          <p className="text-white/40 text-xs mt-4">Secure giving. Every peso is accounted for.</p>
        </div>
      </section>

      {/* ── Photo Story ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Life at Beacon</div>
            <h2 className="text-3xl font-bold text-[#0e2118]">Joy lives here.</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">Our residents grow, laugh, learn, and heal together in a community built on trust and compassion.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl overflow-hidden h-72">
              <img src={jumpImg} alt="Children jumping joyfully" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden h-72">
              <img src={circleImg} alt="Children in a circle" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── How We Serve ────────────────────────────────────────────────── */}
      <section className="bg-[#f9f9f7] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Our Approach</div>
            <h2 className="text-3xl font-bold text-[#0e2118]">A continuum of care</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              Every girl who enters Beacon's care moves through three interconnected phases — each designed around her individual needs and pace.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {PHASES.map((p) => (
              <div key={p.num} className="relative">
                <div className="w-10 h-0.5 bg-[#2a9d72] mb-5" />
                <div className="text-5xl font-bold text-[#0e2118]/8 absolute -top-3 left-0 leading-none select-none">
                  {p.num}
                </div>
                <div className="text-sm font-bold text-[#2a9d72] mb-2 tracking-wide">{p.num}</div>
                <h3 className="font-bold text-[#0e2118] text-lg mb-3">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/impact"
              className="inline-block border border-[#0e2118] text-[#0e2118] hover:bg-[#0e2118] hover:text-white px-8 py-3 rounded-full font-semibold text-sm transition-colors"
            >
              See Our Full Programs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonial / Quote ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl text-[#2a9d72] mb-6 font-serif leading-none">"</div>
          <blockquote className="text-xl md:text-2xl font-medium text-[#0e2118] leading-relaxed mb-6">
            When I came here I had nothing left. Beacon gave me a family, a future, and a reason to believe in myself again.
          </blockquote>
          <div className="text-sm text-gray-400 italic">— A Beacon resident, age 17</div>
          <div className="mt-10">
            <Link
              href="/impact"
              className="inline-block border-2 border-[#2a9d72] text-[#2a9d72] hover:bg-[#2a9d72] hover:text-white px-8 py-3 rounded-full font-semibold transition-colors"
            >
              See Our Full Impact
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final Donate CTA ────────────────────────────────────────────── */}
      <section className="bg-[#2a9d72] py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Be someone's beacon of hope.</h2>
          <p className="text-white/80 mb-8 text-lg">A single gift — any size — tells a survivor she matters.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/donate"
              onClick={() => triggerDonationConfetti()}
              className="bg-white text-[#2a9d72] hover:bg-gray-50 px-10 py-4 rounded-full font-bold text-lg transition-colors shadow-lg"
            >
              Give Today
            </Link>
            <Link
              href="/socials"
              className="border-2 border-white/60 text-white hover:bg-white/10 px-8 py-4 rounded-full font-semibold transition-colors"
            >
              Follow Our Journey
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
