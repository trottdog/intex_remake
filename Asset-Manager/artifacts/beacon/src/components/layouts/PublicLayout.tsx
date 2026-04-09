import { useState } from "react";
import { Link, useLocation } from "wouter";
import lighthouseLogo from "@assets/Minimalist_lighthouse_logo_design_1775623783267.png";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/impact", label: "Impact" },
  { href: "/socials", label: "Socials" },
];

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "instant" });
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" onClick={scrollToTop} className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#0e2118] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <img src={lighthouseLogo} alt="Beacon Sanctuary" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-[#0e2118] text-base tracking-tight">Beacon</span>
              <span className="text-[10px] text-[#2a9d72] font-semibold uppercase tracking-widest">Sanctuary PH</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={scrollToTop}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location === link.href
                    ? "text-[#0e2118] bg-[#f0faf6]"
                    : "text-gray-600 hover:text-[#0e2118] hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={scrollToTop}
              className="ml-2 border border-gray-300 hover:border-[#0e2118] text-gray-600 hover:text-[#0e2118] px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="/donate"
              onClick={scrollToTop}
              className="ml-2 bg-[#2a9d72] hover:bg-[#248c64] text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors shadow-sm"
            >
              Donate Now
            </Link>
          </nav>

          <button
            className="md:hidden flex flex-col gap-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-current"></div>
            <div className="w-5 h-0.5 bg-current"></div>
            <div className="w-5 h-0.5 bg-current"></div>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => { setMenuOpen(false); scrollToTop(); }}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => { setMenuOpen(false); scrollToTop(); }}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/donate"
              onClick={() => { setMenuOpen(false); scrollToTop(); }}
              className="block mt-2 text-center bg-[#2a9d72] text-white px-4 py-2.5 rounded-full text-sm font-semibold"
            >
              Donate Now
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#0e2118] text-white">
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
