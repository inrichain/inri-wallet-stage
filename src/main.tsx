import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const RESUME_RELOAD_KEY = "__inri_wallet_resume_reload__";
const HIDDEN_AT_KEY = "__inri_wallet_hidden_at__";

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

function safeReloadOnce(reason: string) {
  try {
    if (sessionStorage.getItem(RESUME_RELOAD_KEY) === reason) return;
    sessionStorage.setItem(RESUME_RELOAD_KEY, reason);
  } catch {}
  window.location.reload();
}

function rootLooksBlank() {
  const root = document.getElementById("root");
  if (!root) return true;
  if (!root.hasChildNodes()) return true;
  const hasWalletShell = !!document.querySelector(".wallet-page-shell, .wallet-auth-shell");
  return !hasWalletShell && root.textContent?.trim() === "";
}

function installResumeGuards() {
  const rememberHidden = () => {
    try {
      sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
    } catch {}
  };

  const checkVisibleState = () => {
    let hiddenAt = 0;
    try {
      hiddenAt = Number(sessionStorage.getItem(HIDDEN_AT_KEY) || "0");
      sessionStorage.removeItem(HIDDEN_AT_KEY);
    } catch {}

    const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
    window.setTimeout(() => {
      if ((awayMs > 1200 || document.visibilityState === "visible") && rootLooksBlank()) {
        safeReloadOnce("resume-blank-root");
      } else {
        try {
          sessionStorage.removeItem(RESUME_RELOAD_KEY);
        } catch {}
      }
    }, 140);
  };

  window.addEventListener("pagehide", rememberHidden);
  window.addEventListener("pageshow", (event) => {
    if ((event as PageTransitionEvent).persisted) {
      safeReloadOnce("pageshow-persisted");
      return;
    }
    checkVisibleState();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      rememberHidden();
      return;
    }
    checkVisibleState();
  });

  window.addEventListener("focus", checkVisibleState);
  window.addEventListener("error", () => {
    window.setTimeout(() => {
      if (rootLooksBlank()) safeReloadOnce("runtime-error");
    }, 80);
  });
  window.addEventListener("unhandledrejection", () => {
    window.setTimeout(() => {
      if (rootLooksBlank()) safeReloadOnce("promise-rejection");
    }, 80);
  });
}

type BoundaryState = { hasError: boolean };

class RootErrorBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)", color: "#ffffff" }}>
        <div style={{ width: "min(420px, 100%)", border: "1px solid rgba(148,163,184,.18)", borderRadius: 24, padding: 20, background: "#101827", display: "grid", gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 900 }}>INRI Wallet</div>
          <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}>The app had a rendering problem after returning to the browser. Refresh once to recover.</div>
          <button onClick={() => safeReloadOnce("boundary-refresh")} style={{ border: "1px solid rgba(63,124,255,.38)", background: "rgba(63,124,255,.14)", color: "#ffffff", borderRadius: 14, padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}>Refresh wallet</button>
        </div>
      </div>
    );
  }
}

installResumeGuards();

cleanupLegacyPwa().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
});
