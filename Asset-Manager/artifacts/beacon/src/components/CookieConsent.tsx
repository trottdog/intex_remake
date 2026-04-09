import { useState, useEffect } from "react";
import { getCookie, setCookie } from "@/lib/cookies";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = getCookie("beacon_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAcceptAll = () => {
    setCookie("beacon_consent", "all");
    setShow(false);
  };

  const handleReject = () => {
    setCookie("beacon_consent", "essential");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d9e5de] bg-white/98 shadow-[0_-18px_48px_rgba(14,33,24,0.14)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="max-w-3xl text-sm text-[#3b4f45]">
          <p className="font-semibold text-[#214636]">Cookie preferences</p>
          <p className="mt-1 leading-relaxed">
            Beacon only stores essential on-device preferences such as your theme, sidebar state, and cookie-consent choice.
            Choosing <span className="font-medium text-[#214636]">Accept All</span> opts you into optional analytics or personalization
            if those features are enabled later. Authentication does not rely on cookies.
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium">
            <Link href="/privacy" className="text-[#2a9d72] hover:text-[#214636] hover:underline">
              Read the privacy policy
            </Link>
            <span className="text-[#6e7f76]">Essential preferences remain available either way.</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={handleReject}>Essential Only</Button>
          <Button onClick={handleAcceptAll}>Accept All</Button>
        </div>
      </div>
    </div>
  );
}
