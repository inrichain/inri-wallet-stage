import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const BASE = import.meta.env.BASE_URL || "/";
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
    if (sessionStorage.getItem(RESUME_RELOAD_KEY) === reason) return false;
    sessionStorage.setItem(RESUME_RELOAD_KEY, reason);
  } catch {}
  window.location.reload();
  return true;
}

function clearReloadReason() {
  try {
    sessionStorage.removeItem(RESUME_RELOAD_KEY);
  } catch {}
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
        clearReloadReason();
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

function WalletRecoveryScreen() {
  const autoAttemptAlreadyUsed = useMemo(() => {
    try {
      return sessionStorage.getItem(RESUME_RELOAD_KEY) === "boundary-auto-refresh";
    } catch {
      return false;
    }
  }, []);
  const [seconds, setSeconds] = useState(autoAttemptAlreadyUsed ? 0 : 2);

  useEffect(() => {
    if (autoAttemptAlreadyUsed) return;

    const tick = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(tick);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    const reloadTimer = window.setTimeout(() => {
      safeReloadOnce("boundary-auto-refresh");
    }, 1650);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(reloadTimer);
    };
  }, [autoAttemptAlreadyUsed]);

  return (
    <div className="wallet-recovery-shell">
      <div className="wallet-recovery-card">
        <div className="wallet-recovery-brand">
          <img className="wallet-recovery-logo" src={`${BASE}brand-inri.png`} alt="INRI" />
          <div>
            <div className="wallet-recovery-title">INRI Wallet</div>
            <div className="wallet-recovery-subtitle">Restoring your secure session</div>
          </div>
        </div>

        <div className="wallet-recovery-copy">
          {autoAttemptAlreadyUsed
            ? "The wallet is ready to recover. Tap refresh to reopen the interface cleanly."
            : "The wallet is reopening after returning to the browser. This usually takes just a moment."}
        </div>

        <div className="wallet-recovery-status-row">
          <div className="wallet-recovery-spinner" aria-hidden="true" />
          <div className="wallet-recovery-status-text">
            {autoAttemptAlreadyUsed
              ? "Manual recovery available"
              : `Automatic recovery starts in ${seconds || 1}s`}
          </div>
        </div>

        <div className="wallet-recovery-progress" aria-hidden="true">
          <div className="wallet-recovery-progress-bar" />
        </div>

        <div className="wallet-recovery-actions">
          <button
            className="wallet-recovery-btn wallet-recovery-btn-primary"
            onClick={() => safeReloadOnce("boundary-manual-refresh")}
          >
            Refresh wallet
          </button>
          <button
            className="wallet-recovery-btn wallet-recovery-btn-secondary"
            onClick={() => window.location.assign(window.location.href)}
          >
            Reopen page
          </button>
        </div>

        <div className="wallet-recovery-note">
          Your wallet data stays local. This only refreshes the interface.
        </div>
      </div>
    </div>
  );
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
    return <WalletRecoveryScreen />;
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
