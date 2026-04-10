import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { getCookie } from "@/lib/cookies";
import { reconcileConsentCookies } from "@/lib/consent";

const apiBase =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://beacon-api.azurewebsites.net" : "");
setBaseUrl(apiBase);

// Apply saved theme
const savedTheme = getCookie("beacon_theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

// Keep non-essential cookies aligned with consent on every app load.
reconcileConsentCookies();

createRoot(document.getElementById("root")!).render(<App />);
