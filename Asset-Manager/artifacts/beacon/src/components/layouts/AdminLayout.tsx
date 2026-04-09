import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, FileText, Calendar, Heart, PieChart,
  ShieldAlert, ListChecks, Bell, Settings, Handshake, Newspaper, Home, ClipboardList, DollarSign,
} from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/services/api";

const ADMIN_NAV = [
  { label: "Dashboard",           href: "/admin",                      icon: LayoutDashboard, section: "Overview" },
  { label: "Tasks & Alerts",      href: "/admin/tasks-alerts",          icon: Bell,            section: "Overview" },

  { label: "Residents",           href: "/admin/residents",             icon: Users,           section: "Resident Care" },
  { label: "Caseload",            href: "/admin/caseload",              icon: ListChecks,      section: "Resident Care" },

  { label: "Process Recordings",  href: "/admin/process-recordings",   icon: FileText,        section: "Case Management" },
  { label: "Home Visits",         href: "/admin/home-visits",           icon: Home,            section: "Case Management" },
  { label: "Case Conferences",    href: "/admin/case-conferences",      icon: Calendar,        section: "Case Management" },
  { label: "Intervention Plans",  href: "/admin/intervention-plans",   icon: ClipboardList,   section: "Case Management" },

  { label: "Incidents",           href: "/admin/incidents",             icon: ShieldAlert,     section: "Safeguarding" },

  { label: "Donors",              href: "/admin/donors",                icon: Heart,           section: "Community" },
  { label: "Partners",            href: "/admin/partners",              icon: Handshake,       section: "Community" },
  { label: "Donations",           href: "/admin/donations",             icon: DollarSign,      section: "Community" },
  { label: "Program Updates",     href: "/admin/program-updates",       icon: Newspaper,       section: "Community" },

  { label: "Reports",             href: "/admin/reports",               icon: PieChart,        section: "Administration" },
  { label: "Settings",            href: "/admin/settings",              icon: Settings,        section: "Administration" },
];

interface PublicSafehouse { safehouseId: number; safehouseName: string | null; }

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [safehouseLabel, setSafehouseLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    const ids = user?.safehouses ?? [];
    if (ids.length === 0) return;
    apiFetch<{ data: PublicSafehouse[] }>("/api/public/safehouses")
      .then(res => {
        const match = (res.data ?? []).find(s => ids.includes(s.safehouseId));
        if (match?.safehouseName) setSafehouseLabel(match.safehouseName);
        else if (ids.length > 0) setSafehouseLabel(`Safehouse #${ids[0]}`);
      })
      .catch(() => {
        if (ids.length > 0) setSafehouseLabel(`Safehouse #${ids[0]}`);
      });
  }, [user]);

  return (
    <DashboardLayout navItems={ADMIN_NAV} portalName="Admin Portal" safehouseLabel={safehouseLabel}>
      {children}
    </DashboardLayout>
  );
}
