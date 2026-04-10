import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost } from "@/services/api";
import { Instagram, Facebook, Linkedin, Heart, MessageCircle, Share2, Eye, Loader2, FileText, Tag } from "lucide-react";
import { SOCIAL_FEED_POSTS } from "@/lib/social-feed";

interface ProgramUpdate {
  updateId: number;
  title: string;
  summary: string | null;
  category: string | null;
  isPublished: boolean | null;
  publishedAt: string | null;
  createdAt: string | null;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") return <Instagram className="w-4 h-4 text-pink-500" />;
  if (platform === "facebook") return <Facebook className="w-4 h-4 text-blue-600" />;
  if (platform === "linkedin") return <Linkedin className="w-4 h-4 text-blue-700" />;
  return null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  "Announcement":    "bg-blue-50 text-blue-700",
  "Success Story":   "bg-green-50 text-green-700",
  "Infrastructure":  "bg-purple-50 text-purple-700",
  "Partnership":     "bg-indigo-50 text-indigo-700",
  "Program Update":  "bg-teal-50 text-teal-700",
  "Milestone":       "bg-amber-50 text-amber-700",
  "Other":           "bg-gray-100 text-gray-600",
};

export default function UpdatesPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data: updatesRes, isLoading: loadingUpdates } = useQuery({
    queryKey: ["program-updates"],
    queryFn: () => apiFetch<{ data: ProgramUpdate[] }>("/api/program-updates", token ?? undefined),
    enabled: !!token,
  });

  const updates = updatesRes?.data ?? [];

  const { mutate: markViewed } = useMutation({
    mutationFn: ({ itemType, itemIds }: { itemType: string; itemIds: number[] }) =>
      apiPost("/api/donor/viewed-items", { itemType, itemIds }, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["donor-notifications"] }),
  });

  useEffect(() => {
    if (updates.length > 0) {
      markViewed({ itemType: "update", itemIds: updates.map(u => u.updateId) });
    }
  }, [updates.length]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0e2118]">Program Updates</h1>
        <p className="text-[#0e2118]/60 mt-1">Stay informed on our programs, milestones, and the lives your giving is changing.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#0e2118] mb-4">Latest Updates</h2>
        {loadingUpdates ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading updates...
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e8f5ee] p-10 text-center">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No program updates published yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.updateId} className="bg-white rounded-xl border border-[#e8f5ee] p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {update.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${CATEGORY_COLORS[update.category] ?? "bg-gray-100 text-gray-600"}`}>
                          <Tag className="w-2.5 h-2.5" /> {update.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{fmtDate(update.publishedAt ?? update.createdAt)}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#0e2118] mb-2">{update.title}</h3>
                    {update.summary && (
                      <p className="text-sm text-[#0e2118]/70 leading-relaxed">{update.summary}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#0e2118] mb-4">Social Media Highlights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SOCIAL_FEED_POSTS.map((post, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-52 overflow-hidden">
                <img src={post.image} alt="Social post" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#2a9d72] uppercase tracking-wide inline-flex items-center gap-2">
                    <PlatformIcon platform={post.platform.toLowerCase()} />
                    {post.platform}
                  </span>
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
    </div>
  );
}
