import { deleteCookie, getCookie, setCookie } from "@/lib/cookies";

export type ConsentLevel = "all" | "essential";

const CONSENT_COOKIE = "beacon_consent";
const OPTIONAL_PERSONALIZATION_COOKIE = "beacon_personalization";

export function getConsentLevel(): ConsentLevel | null {
  const value = getCookie(CONSENT_COOKIE);
  if (value === "all" || value === "essential") {
    return value;
  }
  return null;
}

export function hasOptionalConsent(): boolean {
  return getConsentLevel() === "all";
}

export function applyConsent(level: ConsentLevel): void {
  setCookie(CONSENT_COOKIE, level);

  if (level === "all") {
    // This cookie is intentionally non-essential and exists only for users who opt in.
    setCookie(OPTIONAL_PERSONALIZATION_COOKIE, "enabled", 90);
    return;
  }

  deleteCookie(OPTIONAL_PERSONALIZATION_COOKIE);
}

export function reconcileConsentCookies(): void {
  const level = getConsentLevel();
  if (!level) {
    deleteCookie(OPTIONAL_PERSONALIZATION_COOKIE);
    return;
  }

  if (level === "all") {
    if (!getCookie(OPTIONAL_PERSONALIZATION_COOKIE)) {
      setCookie(OPTIONAL_PERSONALIZATION_COOKIE, "enabled", 90);
    }
    return;
  }

  deleteCookie(OPTIONAL_PERSONALIZATION_COOKIE);
}
