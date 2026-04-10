import { Link } from "wouter";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Heart, MessageCircle, Share2, Eye } from "lucide-react";
import type { IconType } from "react-icons";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import sunsetImg from "@assets/SunsetArmsUp_1775623133974.jpg";
import { SOCIAL_FEED_POSTS } from "@/lib/social-feed";

type SocialChannel = {
  name: string;
  handle: string;
  url: string;
  description: string;
  followers: string;
  color: string;
  Icon: IconType;
};

const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    name: "Facebook",
    handle: "@BeaconSanctuaryPH",
    url: "https://facebook.com",
    description: "Community updates, stories, and event announcements",
    followers: "4,200",
    color: "bg-[#1877F2]",
    Icon: FaFacebookF,
  },
  {
    name: "Instagram",
    handle: "@beacon.sanctuary.ph",
    url: "https://instagram.com",
    description: "Photo stories, reels, and behind-the-scenes life at the home",
    followers: "2,800",
    color: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#833ab4]",
    Icon: FaInstagram,
  },
  {
    name: "X (Twitter)",
    handle: "@BeaconSanctuaryPH",
    url: "https://x.com",
    description: "Advocacy updates, news, and mission-critical announcements",
    followers: "1,100",
    color: "bg-[#14171A]",
    Icon: FaXTwitter,
  },
  {
    name: "YouTube",
    handle: "Beacon Sanctuary PH",
    url: "https://youtube.com",
    description: "Documentary shorts, testimonials, and program walkthroughs",
    followers: "890",
    color: "bg-[#FF0000]",
    Icon: FaYoutube,
  },
];

export default function SocialsPage() {
  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-[#214636] py-20 px-6 text-center overflow-hidden">
        <img src={sunsetImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative max-w-2xl mx-auto">
          <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Connect With Us</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
            Follow Our Story.<br />
            <span className="text-[#2a9d72]">Share Our Mission.</span>
          </h1>
          <p className="text-white/70 text-lg">
            Stay connected with life at Beacon — the milestones, the moments, and the girls whose lives are being transformed every day.
          </p>
        </div>
      </section>

      {/* ── Recent Posts ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Recent Posts</div>
            <h2 className="text-3xl font-bold text-[#214636]">What We’ve Been Sharing</h2>
            <p className="text-gray-500 mt-2">Real moments from real lives inside Beacon.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOCIAL_FEED_POSTS.map((post, i) => (
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
                      <Share2 className="w-3 h-3" />
                      {post.shares.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comments}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.views.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Channels ──────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[#f9f9f7]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-[#2a9d72] font-bold uppercase tracking-widest mb-3">Where to Find Us</div>
            <h2 className="text-2xl font-bold text-[#214636]">Our Social Media Channels</h2>
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
                  <ch.Icon className="text-[1.35rem] text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-[#214636]">{ch.name}</h3>
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

      {/* ── Share CTA ────────────────────────────────────────────────── */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#214636] mb-4">Your share is a lifeline.</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Every time you share our posts, you help a survivor reach someone who might become her next supporter. You don't have to give money to make a difference — your voice matters too.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {SOCIAL_CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-[#214636] border border-[#d7ddd8] text-[#214636] hover:text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-2"
              >
                <ch.Icon className="text-base shrink-0" />
                Follow on {ch.name}
              </a>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-[#e5e7eb]">
            <p className="text-gray-500 mb-4 text-sm">Want to go even further?</p>
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
