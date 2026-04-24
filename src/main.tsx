import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { repairInriWalletState } from "./lib/network";

type RootHandle = ReturnType<typeof ReactDOM.createRoot>;

declare global {
  interface Window {
    __INRI_WALLET_ROOT__?: RootHandle | null;
    __INRI_WALLET_RECOVERY__?: number | null;
    __INRI_WALLET_LAST_HIDDEN_AT__?: number;
  }
}

const AUTO_RELOAD_KEY = "inri_wallet_resume_auto_reload_v1";

function canAutoReload() {
  try {
    const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || "0");
    return !last || Date.now() - last > 8000;
  } catch {
    return true;
  }
}

function markAutoReload() {
  try {
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
  } catch {}
}

function clearAutoReloadFlagLater() {
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(AUTO_RELOAD_KEY);
    } catch {}
  }, 4500);
}

function ResumeRecoveryScreen() {
  React.useEffect(() => {
    if (!canAutoReload()) return;
    markAutoReload();
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const card: React.CSSProperties = {
    width: "min(460px, 100%)",
    borderRadius: 28,
    border: "1px solid rgba(63,124,255,.22)",
    background: "linear-gradient(180deg,#0f1728 0%, #0b1120 100%)",
    boxShadow: "0 28px 80px rgba(0,0,0,.55)",
    padding: 24,
    display: "grid",
    gap: 14,
    color: "#fff",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
  };

  const badge: React.CSSProperties = {
    display: "inline-flex",
    width: "fit-content",
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(63,124,255,.24)",
    background: "rgba(63,124,255,.12)",
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: ".08em",
    textTransform: "uppercase",
  };

  const spinnerWrap: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,.08)",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.03)",
  };

  const button: React.CSSProperties = {
    minHeight: 52,
    borderRadius: 18,
    border: "1px solid rgba(59,130,246,.28)",
    background: "linear-gradient(135deg,#3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 16,
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)",
      }}
    >
      <div style={card}>
        <span style={badge}>INRI Wallet</span>
        <div style={spinnerWrap}>
          <div className="wallet-resume-spinner" aria-hidden="true" />
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.04, fontWeight: 900, letterSpacing: "-.03em" }}>
          Restoring your wallet
        </div>
        <div style={{ color: "#94a3b8", lineHeight: 1.6 }}>
          We are safely restoring your session after returning to the browser.
        </div>
        <button style={button} onClick={() => window.location.reload()}>
          Reopen wallet
        </button>
      </div>
    </div>
  );
}

class RootBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("INRI Wallet root crash", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ResumeRecoveryScreen />;
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
  }, force ? 80 : 180);
}

repairInriWalletState();

cleanupLegacyPwa().finally(() => {
  clearAutoReloadFlagLater();
  renderApp();

  const handleVisibleAgain = () => {
    if (document.visibilityState !== "visible") return;
    recoverIfNeeded(false);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.__INRI_WALLET_LAST_HIDDEN_AT__ = Date.now();
      return;
    }
    handleVisibleAgain();
  });

  window.addEventListener("pageshow", handleVisibleAgain);
  window.addEventListener("focus", handleVisibleAgain);
  window.addEventListener("resume", handleVisibleAgain as EventListener);

  window.setInterval(() => {
    if (document.visibilityState === "visible") recoverIfNeeded(false);
  }, 2500);
});
