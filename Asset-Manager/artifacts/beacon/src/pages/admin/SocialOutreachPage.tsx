import { useListSocialMediaPosts } from "@/services";
import { Share2, Users, Heart, MessageCircle } from "lucide-react";

export default function SocialOutreachPage() {
  const { data, isLoading } = useListSocialMediaPosts();
  const posts = data?.data ?? [];

  const stats = {
    totalPosts: posts.length,
    totalReach: posts.reduce((s, p) => s + (p.reach ?? 0), 0),
    totalLikes: posts.reduce((s, p) => s + (p.likes ?? 0), 0),
    totalComments: posts.reduce((s, p) => s + (p.comments ?? 0), 0),
  };

  const platformColor: Record<string, string> = {
    facebook: "bg-blue-100 text-blue-700",
    instagram: "bg-pink-100 text-pink-700",
    twitter: "bg-sky-100 text-sky-700",
    tiktok: "bg-purple-100 text-purple-700",
    youtube: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social &amp; Outreach</h1>
        <p className="text-gray-500 mt-1">Monitor social media activity and outreach metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: stats.totalPosts, icon: Share2, color: "text-[#2a9d72]" },
          { label: "Total Reach", value: stats.totalReach.toLocaleString(), icon: Users, color: "text-blue-600" },
          { label: "Total Likes", value: stats.totalLikes.toLocaleString(), icon: Heart, color: "text-pink-600" },
          { label: "Total Comments", value: stats.totalComments.toLocaleString(), icon: MessageCircle, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <MessageCircle className="h-8 w-8" />
            <p>No social media posts found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Content</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Reach</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Likes</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Comments</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Referrals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${platformColor[post.platform] ?? "bg-gray-100 text-gray-700"}`}>
                      {post.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{post.postType}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{post.content}</td>
                  <td className="px-4 py-3 text-gray-500">{post.postDate}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(post.reach ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(post.likes ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(post.comments ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(post.donationReferrals ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
