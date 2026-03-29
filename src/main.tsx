import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

function renderApp() {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

async function cleanupLegacyPwa() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {}
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {}
}

let resumeHealTimer = 0;
let resumeReloadArmed = false;

function clearResumeReloadFlag() {
  try {
    sessionStorage.removeItem("inri_resume_reload_once");
  } catch {}
}

function scheduleResumeHeal(source: string) {
  if (document.visibilityState === "hidden") return;

  window.clearTimeout(resumeHealTimer);
  document.body.classList.add("wallet-resume-heal");
  rootElement.classList.add("wallet-resume-heal-root");

  resumeHealTimer = window.setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          renderApp();
        } catch {}

        window.setTimeout(() => {
          document.body.classList.remove("wallet-resume-heal");
          rootElement.classList.remove("wallet-resume-heal-root");
        }, 420);

        window.setTimeout(() => {
          const hasUi = !!document.querySelector(".wallet-page-shell, .wallet-auth-shell, .wallet-surface, .wallet-bottom-nav");
          if (hasUi) {
            clearResumeReloadFlag();
            resumeReloadArmed = false;
            return;
          }

          if (resumeReloadArmed) return;
          resumeReloadArmed = true;

          try {
            const last = sessionStorage.getItem("inri_resume_reload_once");
            const now = String(Date.now());
            if (last && Date.now() - Number(last) < 20000) return;
            sessionStorage.setItem("inri_resume_reload_once", now);
          } catch {}

          window.location.reload();
        }, 900);
      });
    });
  }, source === "focus" ? 80 : 140);
}

function installResumeFix() {
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      scheduleResumeHeal("visibilitychange");
    }
  };

  const onPageShow = () => scheduleResumeHeal("pageshow");
  const onFocus = () => scheduleResumeHeal("focus");

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("focus", onFocus);
}

cleanupLegacyPwa().finally(() => {
  renderApp();
  installResumeFix();
});
