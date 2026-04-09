import { useEffect } from "react";
import { LayoutDashboard, Heart, Activity, Globe, MessageSquare, User } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiPost } from "@/services/api";

interface NotificationItem {
  id: number;
  type: "update" | "campaign";
  title: string;
  summary: string | null;
  category: string | null;
  date: string | null;
}

interface NotificationsResponse {
  unreadUpdatesCount: number;
  unreadCampaignsCount: number;
  totalUnread: number;
  items: NotificationItem[];
}

export function DonorLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs } = useQuery<NotificationsResponse>({
    queryKey: ["donor-notifications"],
    queryFn: () => apiFetch<NotificationsResponse>("/api/donor/notifications", token ?? undefined),
    enabled: !!token && user?.role === "donor",
    refetchInterval: 60_000,
  });

  const { mutate: markViewed } = useMutation({
    mutationFn: ({ itemType, itemIds }: { itemType: string; itemIds: number[] }) =>
      apiPost("/api/donor/viewed-items", { itemType, itemIds }, token ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["donor-notifications"] }),
  });

  function handleBellOpen() {
    if (!notifs?.items?.length) return;
    const updateIds = notifs.items.filter(i => i.type === "update").map(i => i.id);
    const campaignIds = notifs.items.filter(i => i.type === "campaign").map(i => i.id);
    if (updateIds.length) markViewed({ itemType: "update", itemIds: updateIds });
    if (campaignIds.length) markViewed({ itemType: "campaign", itemIds: campaignIds });
  }

  const navItems = [
    { label: "Dashboard", href: "/donor", icon: LayoutDashboard },
    { label: "My Giving", href: "/donor/giving", icon: Heart },
    { label: "My Impact", href: "/donor/impact", icon: Activity },
    {
      label: "Campaigns", href: "/donor/campaigns", icon: Globe,
      badge: notifs?.unreadCampaignsCount ?? 0,
    },
    {
      label: "Updates", href: "/donor/updates", icon: MessageSquare,
      badge: notifs?.unreadUpdatesCount ?? 0,
    },
    { label: "Profile", href: "/donor/profile", icon: User },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      portalName="Donor Portal"
      bellBadge={notifs?.totalUnread ?? 0}
      bellItems={notifs?.items ?? []}
      onBellOpen={handleBellOpen}
    >
      {children}
    </DashboardLayout>
  );
}
