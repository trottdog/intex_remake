import { Link } from "wouter";
import { useGetPublicImpact } from "@/services";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Users, Building2, TrendingUp, Heart } from "lucide-react";
import beachImg from "@assets/HoldingHandsAtBeach_1775623758874.jpg";
import jumpImg from "@assets/BackwardsJump-e1741389606772_1775623133972.jpg";
import sunsetImg from "@assets/SunsetArmsUp_1775623133974.jpg";
import circleImg from "@assets/GreenGrassFingerStar-e1741389539890_1775623133974.jpg";
import pinkImg from "@assets/PinkShirtPinkFlower-768x705_1775623133974.jpg";

const PROGRAMS = [
  { name: "Emergency Shelter", desc: "Safe 24/7 housing away from harm, staffed by trained house mothers and security." },
  { name: "Trauma Counseling", desc: "Individual and group therapy sessions with licensed clinical psychologists." },
  { name: "Education & Tutoring", desc: "In-house academic support and scholarship funding from elementary through college." },
  { name: "Life Skills Training", desc: "Cooking, financial literacy, career readiness, and leadership development." },
  { name: "Health & Wellness", desc: "Regular medical check-ups, mental health monitoring, and nutritional meals." },
  { name: "Family Reintegration", desc: "Structured family reconciliation programs and aftercare support." },
];

export default function PublicImpactPage() {
  const { data, isLoading } = useGetPublicImpact();

  const stats = [
    {
      label: "Survivors Served",
      value: data?.residentsServedTotal ? `${data.residentsServedTotal}+` : "500+",
      icon: Users,
      color: "text-[#2a9d72]",
      bg: "bg-[#f0faf6]",
      desc: "Girls who found safety in our network",
    },
    {
      label: "Safe Homes",
      value: data?.safehouseCount ? String(data.safehouseCount) : "3",
      icon: Building2,
      color: "text-[#214636]",
      bg: "bg-[#e6f0ea]",
      desc: "Operational facilities across the Philippines",
    },
    {
      label: "Reintegrations",
      value: data?.reintegrationCount ? String(data.reintegrationCount) : "87",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      desc: "Residents successfully returned to safe families",
    },
    {
      label: "Donations Raised",
      value: data?.totalDonationsRaised != null
        ? `₱${Number(data.totalDonationsRaised).toLocaleString()}`
        : "₱4.2M+",
      icon: Heart,
      color: "text-rose-600",
      bg: "bg-rose-50",
      desc: "Funds raised to sustain care and programs",
    },
  ];

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-[#214636] py-24 px-6 overflow-hidden">
        <img src={beachImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Our Impact</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
            Real numbers.<br />
            <span className="text-[#2a9d72]">Real lives changed.</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Beacon Sanctuary is committed to transparency. Here is what your support has accomplished — in data, in stories, and in lives.
          </p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[#f9f9f7]">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse h-36" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <p className="text-3xl font-bold text-[#214636] mb-0.5">{s.value}</p>
                  <p className="font-semibold text-gray-800 text-sm mb-1">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Impact Photo Collage ──────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Life at Beacon</div>
            <h2 className="text-3xl font-bold text-[#214636]">See the difference your support makes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl overflow-hidden h-80">
              <img src={beachImg} alt="Girls holding hands at the beach" className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-rows-2 gap-4 h-80">
              <div className="rounded-2xl overflow-hidden">
                <img src={pinkImg} alt="Resident creating art" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl overflow-hidden">
                <img src={jumpImg} alt="Children jumping joyfully" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Programs ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#f9f9f7]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">What We Do</div>
            <h2 className="text-3xl font-bold text-[#214636]">Our Programs</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">
              Every program at Beacon is designed to address one of the dimensions of healing and growth our residents need.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROGRAMS.map((p, i) => (
              <div key={p.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="w-8 h-8 bg-[#214636] rounded-lg flex items-center justify-center text-[#ecfff6] font-bold text-sm mb-4">
                  {i + 1}
                </div>
                <h3 className="font-bold text-[#214636] mb-2">{p.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Milestones ───────────────────────────────────────────────── */}
      {data?.milestones && data.milestones.length > 0 && (
        <section className="py-20 px-6 bg-[#214636]">
          <div className="max-w-5xl mx-auto text-center">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Milestones</div>
            <h2 className="text-3xl font-bold text-white mb-12">Numbers that represent real transformation</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {data.milestones.map((m: { title: string; value: string; description: string }) => (
                <div key={m.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="text-4xl font-bold text-[#2a9d72] mb-2">{m.value}</div>
                  <div className="text-white font-medium mb-1">{m.title}</div>
                  <div className="text-white/50 text-sm">{m.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Recent Impact Snapshots ──────────────────────────────────── */}
      {data?.recentSnapshots && data.recentSnapshots.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Recent Reports</div>
              <h2 className="text-2xl font-bold text-[#214636]">Impact Snapshots</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.recentSnapshots.map((snap: { id: number; title: string; period: string; residentsServed: number; reintegrationCount: number; summary?: string }) => (
                <div key={snap.id} className="bg-[#f9f9f7] rounded-2xl border border-gray-100 p-5">
                  <div className="text-xs font-bold text-[#2a9d72] uppercase tracking-wide mb-3">{snap.period}</div>
                  <h3 className="font-bold text-[#214636] mb-3">{snap.title}</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                      <div className="font-bold text-[#214636]">{snap.residentsServed}</div>
                      <div className="text-xs text-gray-400">Served</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                      <div className="font-bold text-[#2a9d72]">{snap.reintegrationCount}</div>
                      <div className="text-xs text-gray-400">Reintegrated</div>
                    </div>
                  </div>
                  {snap.summary && <p className="text-sm text-gray-500 leading-relaxed">{snap.summary}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Quote / Story ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#f9f9f7]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl overflow-hidden h-72">
            <img src={sunsetImg} alt="Freedom and hope" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-4xl text-[#2a9d72] font-serif mb-4">"</div>
            <blockquote className="text-xl font-medium text-[#214636] leading-relaxed mb-5">
              The first day I arrived at Beacon, I was afraid of everything. Now I teach the younger girls how to cook, how to dream, how to stand up.
            </blockquote>
            <div className="text-sm text-gray-400 italic mb-8">— A Beacon graduate, now a vocational program mentor</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <div className="text-2xl font-bold text-[#2a9d72]">94%</div>
                <div className="text-xs text-gray-500 mt-1">of residents feel safer after 3 months</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <div className="text-2xl font-bold text-[#214636]">87%</div>
                <div className="text-xs text-gray-500 mt-1">successful family reintegration rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Community photo ──────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl overflow-hidden relative h-64">
            <img src={circleImg} alt="Community unity" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(19,40,33,0.42)] to-transparent flex items-center p-10">
              <div className="max-w-sm">
                <p className="text-white font-bold text-2xl mb-2">Together, we heal.</p>
                <p className="text-white/70 text-sm">Community is at the heart of everything we do at Beacon Sanctuary.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="bg-[#2a9d72] py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Be part of the next chapter.</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Every statistic on this page represents a real girl who found hope through the generosity of donors like you. Your gift writes the next success story.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/donate"
              className="bg-white text-[#2a9d72] hover:bg-gray-50 px-10 py-4 rounded-full font-bold text-lg transition-colors shadow-lg"
            >
              Donate Now
            </Link>
            <Link
              href="/about"
              className="border-2 border-white/60 text-white hover:bg-white/10 px-8 py-4 rounded-full font-semibold transition-colors"
            >
              Learn About Us
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
