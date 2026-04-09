import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Shield, Heart, Leaf, Users, BarChart2, Sun } from "lucide-react";
import handsImg from "@assets/Hands_Circle_1775623133974.jpg";
import pinkFlowerImg from "@assets/PinkShirtPinkFlower-768x705_1775623133974.jpg";
import jumpImg from "@assets/BackwardsJump-e1741389606772_1775623133972.jpg";
import circleImg from "@assets/GreenGrassFingerStar-e1741389539890_1775623133974.jpg";
import amaraImg from "../../images/headshots/amara.png";
import davidImg from "../../images/headshots/david.png";
import elenaImg from "../../images/headshots/elena.png";
import julianImg from "../../images/headshots/julian.png";
import marcusImg from "../../images/headshots/marcus.png";

const TEAM = [
  {
    name: "Amara Bennett",
    role: "Executive Director",
    bio: "Kalli leads Beacon's mission with over a decade of experience in nonprofit leadership and child welfare advocacy across Southeast Asia.",
    photo: amaraImg,
  },
  {
    name: "David Mercer",
    role: "Board Chair",
    bio: "Lance brings extensive governance and strategic leadership experience, guiding Beacon's long-term vision and organizational accountability.",
    photo: davidImg,
  },
  {
    name: "Elena Navarro",
    role: "Board Secretary",
    bio: "Russell oversees legal compliance and institutional partnerships, ensuring Beacon operates with integrity and transparency.",
    photo: elenaImg,
  },
  {
    name: "Julian Cross",
    role: "Director of Programs",
    bio: "Candace designs and oversees all resident care programs, ensuring each girl receives individualized support throughout her journey.",
    photo: julianImg,
  },
  {
    name: "Marcus Hale",
    role: "Director of Development",
    bio: "Julie cultivates donor relationships and leads fundraising initiatives that sustain and expand Beacon's network of safe homes.",
    photo: marcusImg,
  },
];

const VALUES = [
  { Icon: Shield, title: "Safety First", desc: "Every decision we make prioritizes the physical, emotional, and digital safety of our residents." },
  { Icon: Heart, title: "Dignity", desc: "We treat every girl as a person of immense worth — never defined by what was done to her." },
  { Icon: Leaf, title: "Holistic Growth", desc: "Healing is not linear. We walk with each resident through every step of her unique journey." },
  { Icon: Users, title: "Partnership", desc: "We collaborate with government agencies, NGOs, churches, and communities to amplify our impact." },
  { Icon: BarChart2, title: "Accountability", desc: "We are transparent stewards of every donation — published reports and open books." },
  { Icon: Sun, title: "Hope", desc: "We believe every survivor carries the potential for a full, joyful, and purposeful life." },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-[#214636] py-24 px-6 overflow-hidden">
        <img src={handsImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">About Us</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
            We exist because<br />every girl deserves a home.
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Beacon Sanctuary PH is a Philippines-based nonprofit organization dedicated to rescuing, sheltering, and rehabilitating girls who have survived sexual abuse and human trafficking.
          </p>
        </div>
      </section>

      {/* ── Our Story ────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Our Story</div>
            <h2 className="text-3xl font-bold text-[#214636] mb-5">From a single room to a network of hope</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              In 2012, our founder opened the doors of a small home in Quezon City to three girls who had nowhere to go. Word spread quietly — through social workers, barangay officials, and a network of volunteers who cared. Within a year, that small home sheltered twelve girls.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Today, Beacon Sanctuary operates three fully-staffed safe homes across Luzon, serving girls between the ages of 8 and 21 who have been rescued from situations of sexual exploitation and trafficking.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We are inspired by organizations like Lighthouse Sanctuary, which has demonstrated that faith-driven, data-informed, and community-rooted care can radically transform outcomes for vulnerable children. We carry that same mission forward in the Philippines.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src={pinkFlowerImg} alt="Resident crafting" className="rounded-2xl object-cover h-64 w-full" />
            <img src={jumpImg} alt="Children at play" className="rounded-2xl object-cover h-64 w-full mt-8" />
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────── */}
      <section className="bg-[#f9f9f7] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">What We Believe</div>
            <h2 className="text-3xl font-bold text-[#214636]">Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-[#f0faf6] rounded-xl flex items-center justify-center mb-4">
                  <v.Icon className="w-5 h-5 text-[#2a9d72]" />
                </div>
                <h3 className="font-bold text-[#214636] mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ─────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-[#214636] rounded-2xl p-8 text-white">
            <div className="text-[#2a9d72] text-xs font-bold uppercase tracking-widest mb-3">Mission</div>
            <h3 className="text-xl font-bold mb-3">What we do</h3>
            <p className="text-white/70 leading-relaxed">
              To provide safe, compassionate, and restorative care for girls who have experienced abuse and trafficking in the Philippines — walking with them from crisis to healing, and from healing to wholeness.
            </p>
          </div>
          <div className="bg-[#2a9d72] rounded-2xl p-8 text-white">
            <div className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Vision</div>
            <h3 className="text-xl font-bold mb-3">What we work toward</h3>
            <p className="text-white/80 leading-relaxed">
              A Philippines where no child is exploited, every survivor finds a safe home, and communities are equipped to protect the most vulnerable among them.
            </p>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────── */}
      <section className="bg-[#f9f9f7] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Board of Directors</div>
            <h2 className="text-3xl font-bold text-[#214636]">The Leadership Behind Beacon</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">Dedicated leaders who have committed their time and expertise to protecting the most vulnerable.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {TEAM.map((member) => (
              <div key={member.name} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-[#214636] text-sm leading-tight">{member.name}</h3>
                  <div className="text-xs text-[#2a9d72] font-semibold uppercase tracking-wide mt-0.5 mb-2">{member.role}</div>
                  <p className="text-xs text-gray-500 leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community photo ──────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl overflow-hidden relative h-72">
            <img src={circleImg} alt="Community activity" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(19,40,33,0.4)] to-transparent flex items-end p-8">
              <div>
                <p className="text-white font-bold text-xl mb-1">Together, we are stronger.</p>
                <p className="text-white/70 text-sm">Every program at Beacon is designed to build community and belonging.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
