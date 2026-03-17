import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";

const BUILD_CACHE_VERSION = "2026-03-17-wcfix-2";

async function resetOldPwaCache() {
  try {
    const previous = localStorage.getItem("inri_wallet_build_cache_version");
    if (previous === BUILD_CACHE_VERSION) return;

    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    if (registrations?.length) {
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    localStorage.setItem("inri_wallet_build_cache_version", BUILD_CACHE_VERSION);
  } catch (err) {
    console.warn("PWA cache reset skipped", err);
  }
}

resetOldPwaCache().finally(() => {
  registerSW({
    immediate: true,
    onRegistered(reg) {
      if (reg) {
        setInterval(() => {
          reg.update();
        }, 60 * 1000);
      }
    },
  });

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
