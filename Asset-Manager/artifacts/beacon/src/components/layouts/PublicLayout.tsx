import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import lighthouseLogo from "@assets/Minimalist_lighthouse_logo_design_1775623783267.png";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/impact", label: "Impact" },
  { href: "/socials", label: "Socials" },
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
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src={lighthouseLogo} alt="Beacon logo" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <div className="font-bold text-white">Beacon Sanctuary PH</div>
                  <div className="text-[10px] text-[#2a9d72] uppercase tracking-widest">Safe Homes · Restored Lives</div>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                A Philippine-based nonprofit providing safe housing and holistic rehabilitation for survivors of abuse and trafficking.
              </p>
              <Link
                href="/donate"
                className="inline-block mt-5 bg-[#2a9d72] hover:bg-[#248c64] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
              >
                Make a Donation
              </Link>
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-4">Navigate</div>
              <div className="space-y-2.5">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} onClick={scrollToTop} className="block text-sm text-white/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                ))}
                <Link href="/donate" onClick={scrollToTop} className="block text-sm text-[#2a9d72] hover:text-[#4db88d] transition-colors font-medium">
                  Donate
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-4">Contact</div>
              <div className="space-y-2.5 text-sm text-white/60">
                <div>info@beaconsanctuary.ph</div>
                <div>+63 917 800 1234</div>
                <div>Quezon City, Philippines</div>
              </div>
              <div className="mt-5 flex gap-3">
                {(["F", "I", "X"] as const).map((initial, i) => (
                  <Link
                    key={i}
                    href="/socials"
                    className="w-8 h-8 bg-white/10 hover:bg-[#2a9d72] rounded-full flex items-center justify-center transition-colors"
                  >
                    <span className="text-xs font-bold text-white">{initial}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <span>© {new Date().getFullYear()} Beacon Sanctuary PH. All rights reserved.</span>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</Link>
              <Link href="/login" className="hover:text-white/70 transition-colors">Staff Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
