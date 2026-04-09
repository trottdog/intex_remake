import { Link } from "wouter";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Heart, MessageCircle } from "lucide-react";
import handsImg from "@assets/Hands_Circle_1775623133974.jpg";
import jumpImg from "@assets/BackwardsJump-e1741389606772_1775623133972.jpg";
import circleImg from "@assets/GreenGrassFingerStar-e1741389539890_1775623133974.jpg";
import pinkImg from "@assets/PinkShirtPinkFlower-768x705_1775623133974.jpg";
import sunsetImg from "@assets/SunsetArmsUp_1775623133974.jpg";
import beachImg from "@assets/HoldingHandsAtBeach_1775623758874.jpg";

const SOCIAL_CHANNELS = [
  {
    name: "Facebook",
    handle: "@BeaconSanctuaryPH",
    url: "https://facebook.com",
    description: "Community updates, stories, and event announcements",
    followers: "4,200",
    color: "bg-[#1877F2]",
    initial: "F",
  },
  {
    name: "Instagram",
    handle: "@beacon.sanctuary.ph",
    url: "https://instagram.com",
    description: "Photo stories, reels, and behind-the-scenes life at the home",
    followers: "2,800",
    color: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#833ab4]",
    initial: "I",
  },
  {
    name: "X (Twitter)",
    handle: "@BeaconSanctuaryPH",
    url: "https://x.com",
    description: "Advocacy updates, news, and mission-critical announcements",
    followers: "1,100",
    color: "bg-[#14171A]",
    initial: "X",
  },
  {
    name: "YouTube",
    handle: "Beacon Sanctuary PH",
    url: "https://youtube.com",
    description: "Documentary shorts, testimonials, and program walkthroughs",
    followers: "890",
    color: "bg-[#FF0000]",
    initial: "Y",
  },
];

const POSTS = [
  {
    platform: "Instagram",
    date: "April 5, 2026",
    caption: "Our girls learned floral arrangement this week — and created something absolutely beautiful. Creativity is part of healing. #BeaconSanctuaryPH #Hope",
    image: pinkImg,
    likes: 284,
    comments: 31,
  },
  {
    platform: "Facebook",
    date: "March 28, 2026",
    caption: "Today marks 5 years since our second safe home opened. From 8 beds to 18 — and counting. Every bed is a life saved. Thank you to every donor who made this possible.",
    image: handsImg,
    likes: 512,
    comments: 87,
  },
  {
    platform: "Instagram",
    date: "March 20, 2026",
    caption: "They held hands. They jumped. They laughed. This is what freedom looks like. #SafeHome #BeaconPH",
    image: jumpImg,
    likes: 743,
    comments: 54,
  },
  {
    platform: "Facebook",
    date: "March 15, 2026",
    caption: "Day 3 of our Summer Camp! The girls formed a star with their fingers — a symbol of unity and light. These moments remind us why we do this work.",
    image: circleImg,
    likes: 398,
    comments: 42,
  },
  {
    platform: "Instagram",
    date: "March 8, 2026",
    caption: "International Women's Day — we celebrate you. Every girl here is a future leader, healer, and changemaker.",
    image: sunsetImg,
    likes: 621,
    comments: 93,
  },
  {
    platform: "Facebook",
    date: "February 22, 2026",
    caption: "The ocean reminds us: no matter how many waves hit you, you keep standing. We are so proud of our girls.",
    image: beachImg,
    likes: 891,
    comments: 126,
  },
];

export default function SocialsPage() {
  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0e2118] py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Connect With Us</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
            Follow our story.<br />
            <span className="text-[#2a9d72]">Share our mission.</span>
          </h1>
          <p className="text-white/70 text-lg">
            Stay connected with life at Beacon — the milestones, the moments, and the girls whose lives are being transformed every day.
          </p>
        </div>
      </section>

      {/* ── Social Channels ──────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[#f9f9f7]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Where to Find Us</div>
            <h2 className="text-2xl font-bold text-[#0e2118]">Our Social Media Channels</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {SOCIAL_CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow flex items-start gap-5 group"
              >
                <div className={`w-12 h-12 ${ch.color} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-white font-bold text-lg">{ch.initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-[#0e2118]">{ch.name}</h3>
                    <span className="text-xs text-gray-400">{ch.followers} followers</span>
                  </div>
                  <div className="text-sm text-[#2a9d72] font-medium mb-1.5">{ch.handle}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{ch.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Posts ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Recent Posts</div>
            <h2 className="text-3xl font-bold text-[#0e2118]">What we've been sharing</h2>
            <p className="text-gray-500 mt-2">Real moments from real lives inside Beacon.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POSTS.map((post, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="h-52 overflow-hidden">
                  <img src={post.image} alt="Social post" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#2a9d72] uppercase tracking-wide">{post.platform}</span>
                    <span className="text-xs text-gray-400">{post.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{post.caption}</p>
                  <div className="flex gap-4 mt-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comments}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Share CTA ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0e2118] to-[#1a3a28] py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Your share is a lifeline.</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Every time you share our posts, you help a survivor reach someone who might become her next supporter. You don't have to give money to make a difference — your voice matters too.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {SOCIAL_CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-[#2a9d72] border border-white/20 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
              >
                Follow on {ch.name}
              </a>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-white/60 mb-4 text-sm">Want to go even further?</p>
            <Link
              href="/donate"
              className="inline-block bg-[#2a9d72] hover:bg-[#248c64] text-white px-10 py-4 rounded-full font-bold text-lg transition-colors"
            >
              Make a Donation
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
