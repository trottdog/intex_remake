import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { getCookie } from "@/lib/cookies";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";
setBaseUrl(apiBase);

// Apply saved theme
const savedTheme = getCookie("beacon_theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
