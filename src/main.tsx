import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

type RootHandle = ReturnType<typeof ReactDOM.createRoot>;

declare global {
  interface Window {
    __INRI_WALLET_ROOT__?: RootHandle | null;
    __INRI_WALLET_RECOVERY__?: number | null;
  }
}

class RootBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: any) {
    console.error("INRI Wallet root crash", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="wallet-resume-overlay">
        <div className="wallet-resume-card">
          <div className="wallet-resume-badge">INRI Wallet</div>
          <div className="wallet-resume-title">Restoring your secure session</div>
          <div className="wallet-resume-text">The app is recovering after returning to the browser. A quick refresh brings everything back safely.</div>
          <button className="wallet-resume-btn" onClick={() => window.location.reload()}>Refresh wallet</button>
        </div>
      </div>
    );
  }
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

function getRootEl() {
  return document.getElementById("root");
}

function renderApp() {
  const el = getRootEl();
  if (!el) return;
  if (!window.__INRI_WALLET_ROOT__) {
    window.__INRI_WALLET_ROOT__ = ReactDOM.createRoot(el);
  }
  window.__INRI_WALLET_ROOT__!.render(
    <React.StrictMode>
      <RootBoundary>
        <App />
      </RootBoundary>
    </React.StrictMode>
  );
}

function rootLooksEmpty() {
  const el = getRootEl();
  if (!el) return true;
  if (el.childElementCount === 0 && !el.textContent?.trim()) return true;
  const rect = el.getBoundingClientRect();
  return rect.height < 4 && rect.width < 4;
}

function recoverIfNeeded(force = false) {
  if (window.__INRI_WALLET_RECOVERY__) {
    window.clearTimeout(window.__INRI_WALLET_RECOVERY__);
  }
  window.__INRI_WALLET_RECOVERY__ = window.setTimeout(() => {
    if (document.visibilityState !== "visible") return;
    if (!force && !rootLooksEmpty()) return;
    try {
      window.__INRI_WALLET_ROOT__?.unmount?.();
    } catch {}
    window.__INRI_WALLET_ROOT__ = null;
    const el = getRootEl();
    if (el) el.innerHTML = "";
    document.body.classList.add("wallet-resume-repaint");
    renderApp();
    window.setTimeout(() => document.body.classList.remove("wallet-resume-repaint"), 260);
  }, force ? 80 : 220);
}

cleanupLegacyPwa().finally(() => {
  renderApp();

  window.addEventListener("pageshow", () => recoverIfNeeded(false));
  window.addEventListener("focus", () => recoverIfNeeded(false));
  window.addEventListener("resume", () => recoverIfNeeded(false) as any);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) recoverIfNeeded(false);
  });

  window.setInterval(() => {
    if (document.visibilityState === "visible") recoverIfNeeded(false);
  }, 2500);
});
