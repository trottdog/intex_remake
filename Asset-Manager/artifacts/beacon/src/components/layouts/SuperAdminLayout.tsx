import {
  LayoutDashboard, Users, Server, Shield, Activity, Settings,
  Database, Share2, Target, Newspaper, PersonStanding, AlertCircle,
  Briefcase, DollarSign, Heart, Layers,
} from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import lighthouseLogo from "@assets/Minimalist_lighthouse_logo_design_1775623783267.png";

const SUPERADMIN_NAV = [
  // ── Overview ────────────────────────────────────────────────────────────────
  { section: "Overview",     label: "Executive Dashboard", href: "/superadmin",                     icon: LayoutDashboard },

  // ── Operations ──────────────────────────────────────────────────────────────
  { section: "Operations",   label: "Residents",           href: "/superadmin/residents",            icon: PersonStanding },
  { section: "Operations",   label: "Caseload",            href: "/superadmin/caseload",             icon: Briefcase },
  { section: "Operations",   label: "Incidents",           href: "/superadmin/incidents",            icon: AlertCircle },
  { section: "Operations",   label: "Case Management",     href: "/superadmin/case-management",      icon: Layers },

  // ── Fundraising ─────────────────────────────────────────────────────────────
  { section: "Fundraising",  label: "Donations",           href: "/superadmin/fundraising",          icon: DollarSign },
  { section: "Fundraising",  label: "Supporters",          href: "/superadmin/donors",               icon: Heart },
  { section: "Fundraising",  label: "Campaigns",           href: "/superadmin/campaigns",            icon: Target },

  // ── Content ─────────────────────────────────────────────────────────────────
  { section: "Content",      label: "Program Updates",     href: "/superadmin/program-updates",      icon: Newspaper },
  { section: "Content",      label: "Impact Snapshots",    href: "/superadmin/impact",               icon: Activity },
  { section: "Content",      label: "Social Outreach",     href: "/superadmin/social-outreach",      icon: Share2 },

  // ── Administration ───────────────────────────────────────────────────────────
  { section: "Administration", label: "Users & Roles",     href: "/superadmin/users",                icon: Users },
  { section: "Administration", label: "Safehouses",        href: "/superadmin/safehouses",           icon: Server },
  { section: "Administration", label: "Partners",          href: "/superadmin/partners",             icon: Share2 },

  // ── Intelligence ─────────────────────────────────────────────────────────────
  { section: "Intelligence", label: "ML Control Center",   href: "/superadmin/ml",                   icon: Activity },

  // ── Security ────────────────────────────────────────────────────────────────
  { section: "Security",     label: "Security & Compliance", href: "/superadmin/security",           icon: Shield },
  { section: "Security",     label: "Audit Logs",          href: "/superadmin/audit",                icon: Database },

  // ── System ──────────────────────────────────────────────────────────────────
  { section: "System",       label: "Settings",            href: "/superadmin/settings",             icon: Settings },
];

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={SUPERADMIN_NAV} portalName="Super Admin" brandLogoSrc={lighthouseLogo}>
      {children}
    </DashboardLayout>
  );
}
