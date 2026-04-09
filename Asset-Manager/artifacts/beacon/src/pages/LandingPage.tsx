import { Link } from "wouter";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { triggerDonationConfetti } from "@/lib/confetti";
import jumpImg from "@assets/BackwardsJump-e1741389606772_1775623133972.jpg";
import circleImg from "@assets/GreenGrassFingerStar-e1741389539890_1775623133974.jpg";
import handsImg from "@assets/Hands_Circle_1775623133974.jpg";
import heroHandsImg from "../../images/bracelets.jpeg";

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
  return (
    <PublicLayout>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-[#FCFAF7] px-6 py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[40px] border border-[#e8ede6] bg-white shadow-[0_32px_80px_rgba(27,67,50,0.05)]">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
              <div className="relative z-10 px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-14">
                <div className="max-w-[30rem]">
                  <h1 className="flex flex-col text-[3rem] font-bold leading-[0.9] tracking-tighter text-[#1B4332] md:text-[4.25rem] lg:text-[5.2rem]">
                    <span>Safety.</span>
                    <span>Healing.</span>
                    <span>Justice.</span>
                    <span>Empowerment.</span>
                  </h1>
                  <p className="mt-6 max-w-md text-base leading-7 text-[#66786e] md:text-lg">
                    Beacon helps survivors rebuild their lives through compassionate housing, trauma-informed support, and long-term care designed for lasting reintegration.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="min-h-12 rounded-full bg-[#1B4332] px-6 py-3.5 text-base font-semibold text-white shadow-[0_16px_30px_rgba(27,67,50,0.14)] transition-transform duration-200 hover:scale-105 hover:bg-[#1B4332]"
                    >
                      <Link href="/donate">Give Safety Today</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="min-h-12 rounded-full border-2 border-[#d3ddd5] bg-white/70 px-6 py-3.5 text-base font-medium text-[#1B4332]/70 transition-colors hover:border-[#1B4332] hover:bg-white hover:text-[#1B4332]"
                    >
                      <Link href="/impact">See How Beacon Works</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative min-h-[320px] overflow-hidden md:min-h-[420px] lg:min-h-full">
                <img
                  src={heroHandsImg}
                  alt="Colorful bracelets held by Beacon residents"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-y-0 left-0 w-[56%] bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.98)_18%,rgba(255,255,255,0.9)_36%,rgba(255,255,255,0.72)_54%,rgba(255,255,255,0.4)_74%,rgba(255,255,255,0.14)_90%,rgba(255,255,255,0)_100%)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who We Help ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 pt-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Our Mission</div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#214636] leading-tight mb-5">
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
                className="inline-flex items-center gap-2 bg-[#214636] hover:bg-[#2d5947] text-white px-7 py-3 rounded-full font-semibold transition-colors"
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

      {/* ── Photo Story ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#f9f9f7]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Life at Beacon</div>
            <h2 className="text-3xl font-bold text-[#214636]">Joy lives here.</h2>
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
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Our Approach</div>
            <h2 className="text-3xl font-bold text-[#214636]">A continuum of care</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              Every girl who enters Beacon's care moves through three interconnected phases — each designed around her individual needs and pace.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {PHASES.map((p) => (
              <div key={p.num} className="relative">
                <div className="w-10 h-0.5 bg-[#2a9d72] mb-5" />
                <div className="text-5xl font-bold text-[#214636]/8 absolute -top-3 left-0 leading-none select-none">
                  {p.num}
                </div>
                <div className="text-sm font-bold text-[#2a9d72] mb-2 tracking-wide">{p.num}</div>
                <h3 className="font-bold text-[#214636] text-lg mb-3">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/impact"
              className="inline-block border border-[#214636] text-[#214636] hover:bg-[#214636] hover:text-white px-8 py-3 rounded-full font-semibold text-sm transition-colors"
            >
              See Our Full Programs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonial / Quote ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#f9f9f7]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl text-[#2a9d72] mb-6 font-serif leading-none">"</div>
          <blockquote className="text-xl md:text-2xl font-medium text-[#214636] leading-relaxed mb-6">
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
