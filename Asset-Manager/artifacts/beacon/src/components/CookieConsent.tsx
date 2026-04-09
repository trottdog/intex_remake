import { useState, useEffect } from "react";
import { getCookie, setCookie } from "@/lib/cookies";
import { Button } from "@/components/ui/button";

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
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border p-4 shadow-lg z-50 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <p><strong>We value your privacy.</strong> We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" onClick={handleReject}>Reject Non-Essential</Button>
        <Button onClick={handleAcceptAll}>Accept All</Button>
      </div>
    </div>
  );
}
