import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { setCookie } from "@/lib/cookies";
import { LogOut, Sun, Moon, Bell, Shield, Menu, X, Target, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  section?: string;
}

interface NotificationItem {
  id: number;
  type: "update" | "campaign";
  title: string;
  summary: string | null;
  category: string | null;
  date: string | null;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  portalName: string;
  brandLogoSrc?: string;
  safehouseLabel?: string;
  /** Tighter nav spacing so sectioned sidebars fit without scrolling on typical desktop heights */
  compactSidebar?: boolean;
  bellBadge?: number;
  bellItems?: NotificationItem[];
  onBellOpen?: () => void;
}

export function DashboardLayout({
  children, navItems, portalName, brandLogoSrc, safehouseLabel, compactSidebar = false,
  bellBadge = 0, bellItems = [], onBellOpen,
}: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setCookie("beacon_theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      setCookie("beacon_theme", "dark");
    }
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bellOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  function handleBellClick() {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && onBellOpen) onBellOpen();
  }

  function fmtDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  const hasSections = navItems.some(item => item.section);
  const c = compactSidebar;
  const navPadX = c ? "px-2" : "px-3";
  const linkGap = c ? "gap-2.5" : "gap-3";
  const linkPad = c ? "px-2 py-1.5" : "px-3 py-2";
  const linkText = c ? "text-[13px] leading-snug" : "text-sm";
  const iconSz = "w-4 h-4";
  const sectionWrap = c ? "pt-2 pb-0.5 px-2" : "pt-4 pb-1 px-3";
  const sectionText = c ? "text-[10px] tracking-wider" : "text-[10px] tracking-widest";

  function renderNavItems(onNavigate?: () => void) {
    const linkCls = (isActive: boolean) =>
      `flex items-center ${linkGap} ${linkPad} rounded-md transition-colors ${linkText} font-medium ${isActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`;

    if (!hasSections) {
      return navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={linkCls(isActive)}
          >
            <item.icon className={`${iconSz} shrink-0 ${isActive ? "text-primary" : ""}`} />
            <span className="flex-1">{item.label}</span>
            {(item.badge ?? 0) > 0 && (
              <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      });
    }

    const rendered: ReactNode[] = [];
    let lastSection = "";
    for (const item of navItems) {
      const section = item.section ?? "";
      if (section !== lastSection) {
        lastSection = section;
        if (section) {
          rendered.push(
            <div key={`section-${section}`} className={sectionWrap}>
              <span className={`${sectionText} font-bold uppercase text-sidebar-foreground/40 select-none`}>{section}</span>
            </div>
          );
        }
      }
      const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
      rendered.push(
        <Link
          key={item.href}
          href={item.href}
          onClick={() => onNavigate?.()}
          className={linkCls(isActive)}
        >
          <item.icon className={`${iconSz} shrink-0 ${isActive ? "text-primary" : ""}`} />
          <span className="flex-1">{item.label}</span>
          {(item.badge ?? 0) > 0 && (
            <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {item.badge! > 99 ? "99+" : item.badge}
            </span>
          )}
        </Link>
      );
    }
    return rendered;
  }

  const asideHeaderClass =
    c && safehouseLabel
      ? "flex items-center px-4 py-2 border-b border-sidebar-border shrink-0"
      : c
        ? "flex items-center h-14 px-4 border-b border-sidebar-border shrink-0"
        : safehouseLabel
          ? "flex items-center px-6 py-4 border-b border-sidebar-border shrink-0"
          : "flex items-center h-16 px-6 border-b border-sidebar-border shrink-0";

  const navScrollClass = c
    ? "overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    : "overflow-y-auto";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col border-r border-sidebar-border shrink-0 fixed h-full z-10">
        <div className={asideHeaderClass}>
          {brandLogoSrc ? (
            <div className={`mr-3 flex items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 shrink-0 ${c ? "h-9 w-9 rounded-xl" : "h-10 w-10"}`}>
              <img src={brandLogoSrc} alt="Beacon" className={`object-contain shrink-0 ${c ? "h-7 w-7" : "h-8 w-8"}`} />
            </div>
          ) : (
            <div className={`bg-primary rounded flex items-center justify-center text-white font-bold mr-3 shrink-0 ${c ? "w-7 h-7 text-xs" : "w-8 h-8"}`}>B</div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-lg leading-tight">Beacon</span>
            <span className="text-xs text-sidebar-accent-foreground/70 uppercase tracking-wider">{portalName}</span>
            {safehouseLabel && (
              <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-[#2a9d72]/20 border border-[#2a9d72]/30 max-w-full">
                <Building2 className="w-3 h-3 text-[#7bc5a6] shrink-0" />
                <span className="text-xs font-semibold text-[#7bc5a6] truncate leading-none">{safehouseLabel}</span>
              </div>
            )}
          </div>
        </div>

        <nav className={`flex-1 min-h-0 py-1.5 ${navPadX} space-y-0 ${navScrollClass}`}>
          {renderNavItems()}
        </nav>

        <div className={`border-t border-sidebar-border ${c ? "p-3" : "p-4"}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold shrink-0">
              {user?.firstName?.[0] || user?.username?.[0] || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-dashboard-nav"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <span className="capitalize">{location.split("/")[1]}</span>
              {location.split("/").length > 2 && (
                <>
                  <span>/</span>
                  <span className="text-gray-900 font-medium capitalize">{location.split("/")[2]?.replace(/-/g, " ")}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {safehouseLabel && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0faf5] text-[#0e2118] text-xs font-semibold border border-[#2a9d72]/30">
                <Building2 className="w-3.5 h-3.5 text-[#2a9d72] shrink-0" />
                {safehouseLabel}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              System Healthy
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="w-4 h-4 hidden dark:block" />
              <Moon className="w-4 h-4 block dark:hidden" />
            </Button>

            <div ref={bellRef} className="relative">
              <button
                onClick={onBellOpen ? handleBellClick : undefined}
                className={`relative inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-gray-100 transition-colors ${onBellOpen ? "cursor-pointer" : "cursor-default"}`}
              >
                <Bell className="w-4 h-4" />
                {bellBadge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {bellBadge > 99 ? "99+" : bellBadge}
                  </span>
                )}
              </button>

              {bellOpen && onBellOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-[#f8faf9]">
                    <div>
                      <span className="font-bold text-[#0e2118] text-sm">Notifications</span>
                      {bellBadge > 0 && (
                        <span className="ml-2 text-xs text-[#2a9d72] font-semibold">{bellBadge} new</span>
                      )}
                    </div>
                    <button onClick={() => setBellOpen(false)} className="text-gray-400 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {bellItems.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">All caught up!</div>
                    ) : (
                      bellItems.map(item => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={item.type === "update" ? "/donor/updates" : "/donor/campaigns"}
                          onClick={() => setBellOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-[#f8faf9] transition-colors"
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.type === "update" ? "bg-[#f0faf5]" : "bg-blue-50"}`}>
                            {item.type === "update" ? <FileText className="w-3.5 h-3.5 text-[#2a9d72]" /> : <Target className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-400 uppercase">{item.type === "update" ? "Update" : "Campaign"}</span>
                              {item.date && <span className="text-xs text-gray-300 shrink-0">{fmtDate(item.date)}</span>}
                            </div>
                            <p className="text-sm font-semibold text-[#0e2118] leading-snug mt-0.5 truncate">{item.title}</p>
                            {item.summary && <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mt-0.5">{item.summary}</p>}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  {bellItems.length > 0 && (
                    <Link href="/donor/updates" onClick={() => setBellOpen(false)}
                      className="block px-4 py-2.5 text-center text-xs font-semibold text-[#2a9d72] hover:bg-[#f0faf5] transition-colors border-t border-gray-50">
                      View all updates
                    </Link>
                  )}
                </div>
              )}
            </div>

            {user?.role === "super_admin" && (
              <Link href="/superadmin/security">
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Shield className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

        <footer className="py-4 px-6 border-t border-border flex justify-between items-center text-xs text-gray-500">
          <span>Beacon Safehouse Platform</span>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </footer>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="mobile-dashboard-nav"
            className="absolute left-0 top-0 bottom-0 w-[min(18rem,100vw)] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl animate-in slide-in-from-left duration-200"
          >
            <div className={`${asideHeaderClass} justify-between gap-2`}>
              <div className="flex items-center min-w-0 flex-1">
                {brandLogoSrc ? (
                  <div className={`mr-3 flex items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 shrink-0 ${c ? "h-9 w-9 rounded-xl" : "h-10 w-10"}`}>
                    <img src={brandLogoSrc} alt="Beacon" className={`object-contain shrink-0 ${c ? "h-7 w-7" : "h-8 w-8"}`} />
                  </div>
                ) : (
                  <div className={`bg-primary rounded flex items-center justify-center text-white font-bold mr-3 shrink-0 ${c ? "w-7 h-7 text-xs" : "w-8 h-8"}`}>B</div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-lg leading-tight">Beacon</span>
                  <span className="text-xs text-sidebar-accent-foreground/70 uppercase tracking-wider">{portalName}</span>
                  {safehouseLabel && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-[#2a9d72]/20 border border-[#2a9d72]/30 max-w-full">
                      <Building2 className="w-3 h-3 text-[#7bc5a6] shrink-0" />
                      <span className="text-xs font-semibold text-[#7bc5a6] truncate leading-none">{safehouseLabel}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent/50"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className={`flex-1 min-h-0 py-2 ${navPadX} space-y-0 overflow-y-auto`}>
              {renderNavItems(() => setMobileNavOpen(false))}
            </nav>
            <div className={`border-t border-sidebar-border ${c ? "p-3" : "p-4"}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.firstName?.[0] || user?.username?.[0] || "U"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
