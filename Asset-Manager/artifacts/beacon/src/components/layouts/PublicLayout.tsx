import { useEffect, useState } from "react";
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { Link, useLocation } from "wouter";
import lighthouseLogo from "@assets/Minimalist_lighthouse_logo_design_1775623783267.png";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/impact", label: "Impact" },
  { href: "/socials", label: "Socials" },
];

const SOCIAL_LINKS = [
  { label: "Facebook", Icon: Facebook },
  { label: "Instagram", Icon: Instagram },
  { label: "X", Icon: Twitter },
];

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    scrollToTop();
    setMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-6">
          <Link href="/" onClick={scrollToTop} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 shadow-[0_10px_22px_rgba(14,33,24,0.08)] ring-1 ring-[#dce7df]">
              <img src={lighthouseLogo} alt="Beacon" className="h-9 w-9 object-contain shrink-0" />
            </div>
            <div className="flex flex-col justify-center leading-tight">
              <span className="font-bold text-[#214636] text-2xl tracking-tight leading-none">Beacon</span>
              <span className="text-[10px] text-[#66786e] font-medium tracking-[0.12em] uppercase">
                Mission-centered nonprofit operations
              </span>
            </div>
          </Link>

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={scrollToTop}
                aria-current={location === link.href ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  location === link.href
                    ? "bg-[#edf7f1] text-[#214636] shadow-[inset_0_0_0_1px_rgba(42,157,114,0.14)]"
                    : "text-[#55675e] hover:bg-white/80 hover:text-[#214636]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={scrollToTop}
              className="ml-2 rounded-full border border-[#ccd8d0] bg-white/70 px-4 py-2 text-sm font-medium text-[#55675e] transition-all duration-200 hover:border-[#214636] hover:text-[#214636]"
            >
              Login
            </Link>
            <Link
              href="/donate"
              onClick={scrollToTop}
              className="ml-1 rounded-full bg-[#2a9d72] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(42,157,114,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#248c64] hover:shadow-[0_18px_34px_rgba(42,157,114,0.3)]"
            >
              Donate Now
            </Link>
          </nav>

          <button
            className="flex flex-col gap-1 rounded-xl p-2 text-[#55675e] transition-colors hover:bg-white/75 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-current"></div>
            <div className="w-5 h-0.5 bg-current"></div>
            <div className="w-5 h-0.5 bg-current"></div>
          </button>
        </div>

        {menuOpen && (
          <div className="space-y-1 border-t border-[#e3e8e4] bg-[#faf8f3]/96 px-6 py-3 shadow-[0_12px_24px_rgba(14,33,24,0.06)] backdrop-blur md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => { setMenuOpen(false); scrollToTop(); }}
                aria-current={location === link.href ? "page" : undefined}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  location === link.href
                    ? "bg-[#edf7f1] text-[#214636]"
                    : "text-[#55675e] hover:bg-white/75"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => { setMenuOpen(false); scrollToTop(); }}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#55675e] hover:bg-white/75"
            >
              Login
            </Link>
            <Link
              href="/donate"
              onClick={() => { setMenuOpen(false); scrollToTop(); }}
              className="mt-2 block rounded-full bg-[#2a9d72] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_14px_28px_rgba(42,157,114,0.22)]"
            >
              Donate Now
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#214636] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-11">
          <div className="grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.72fr)_minmax(0,0.88fr)]">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                  <img src={lighthouseLogo} alt="Beacon logo" className="h-7 w-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold tracking-tight text-white">Beacon Sanctuary PH</div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#2a9d72]">
                    Safe Homes · Restored Lives
                  </div>
                </div>
              </div>
              <p className="max-w-[18rem] text-sm leading-6 text-white/62">
                A Philippine-based nonprofit providing safe housing and holistic rehabilitation for survivors of abuse and trafficking.
              </p>
              <Link
                href="/donate"
                onClick={scrollToTop}
                className="inline-flex rounded-full bg-[#2a9d72] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#248c64]"
              >
                Make a Donation
              </Link>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Navigate</div>
              <div className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={scrollToTop}
                    className="block text-[13px] text-white/72 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/donate"
                  onClick={scrollToTop}
                  className="block text-[13px] font-medium text-[#2a9d72] transition-colors hover:text-[#4db88d]"
                >
                  Donate
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Contact</div>
              <div className="space-y-2.5 text-[13px] text-white/62">
                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
                  <span>info@beaconsanctuary.ph</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
                  <span>+63 917 800 1234</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
                  <span>Quezon City, Philippines</span>
                </div>
              </div>
              <div className="flex gap-2">
                {SOCIAL_LINKS.map(({ label, Icon }) => (
                  <Link
                    key={label}
                    href="/socials"
                    onClick={scrollToTop}
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:bg-[#2a9d72] hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-4 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Beacon Sanctuary PH. All rights reserved.</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
              <Link href="/privacy" onClick={scrollToTop} className="transition-colors hover:text-white/72">
                Privacy Policy
              </Link>
              <Link href="/login" onClick={scrollToTop} className="transition-colors hover:text-white/72">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
