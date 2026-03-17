import React, { useEffect, useState } from "react";
import { getNativeBalance } from "../lib/inri";
import { getStoredNetwork, type NetworkItem } from "../lib/network";
import { tr } from "../i18n/translations";

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export default function DashboardScreen({
  setTab,
  theme = "dark",
  lang = "en",
  address = "",
}: {
  setTab: (tab: any) => void;
  theme?: "dark" | "light";
  lang?: string;
  address?: string;
}) {
  const [balance, setBalance] = useState("0.000000");
  const [canInstall, setCanInstall] = useState(false);
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const isLight = theme === "light";

  useEffect(() => {
    let active = true;

    async function loadBalance() {
      try {
        const value = await getNativeBalance(address || "", network.key);
        if (!active) return;
        setBalance(value);
      } catch {
        if (!active) return;
        setBalance("0.000000");
      }
    }

    loadBalance();
    const timer = setInterval(loadBalance, 8000);

    const handler = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setCanInstall(true);
    };

    const sync = () => setNetwork(getStoredNetwork());

    window.addEventListener("beforeinstallprompt", handler as any);
    window.addEventListener("storage", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", handler as any);
      window.removeEventListener("storage", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
    };
  }, [address, network.key]);

  async function installApp() {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    window.deferredPrompt = null;
    setCanInstall(false);
  }

  const card = {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  } as React.CSSProperties;

  const actions = [
    ["send", tr(lang, "dashboard_send"), tr(lang, "dashboard_send_desc")],
    ["receive", tr(lang, "dashboard_receive"), tr(lang, "dashboard_receive_desc")],
    ["swap", tr(lang, "dashboard_swap"), tr(lang, "dashboard_swap_desc")],
    ["bridge", tr(lang, "dashboard_bridge"), tr(lang, "dashboard_bridge_desc")],
    ["activity", tr(lang, "dashboard_activity"), tr(lang, "dashboard_activity_desc")],
    ["staking", tr(lang, "dashboard_staking"), tr(lang, "dashboard_staking_desc")],
    ["nfts", tr(lang, "dashboard_nfts"), tr(lang, "dashboard_nfts_desc")],
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>
          {tr(lang, "dashboard_total_balance")}
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 900,
            marginTop: 8,
            color: isLight ? "#10131a" : "#ffffff",
            wordBreak: "break-word",
          }}
        >
          {balance} {network.symbol}
        </div>

        <div
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            background: isLight ? "#eef4ff" : "#16213b",
            color: "#3f7cff",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <img src={network.logo} alt={network.name} style={{ width: 18, height: 18, borderRadius: 9 }} />
          {network.name} • Chain {network.chainId}
        </div>

        <div
          style={{
            marginTop: 12,
            color: isLight ? "#5b6578" : "#97a0b3",
            fontSize: 13,
            wordBreak: "break-all",
          }}
        >
          {address}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <a
            href={network.explorerAddressUrl + address}
            target="_blank"
            rel="noreferrer"
            style={actionLink(isLight)}
          >
            {tr(lang, "dashboard_open_explorer")}
          </a>

          {canInstall ? (
            <button onClick={installApp} style={actionButton()}>
              {tr(lang, "dashboard_install_app")}
            </button>
          ) : null}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {actions.map(([id, label, desc]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...card,
              cursor: "pointer",
              textAlign: "left",
              color: isLight ? "#10131a" : "#fff",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>{label}</div>
            <div
              style={{
                color: isLight ? "#5b6578" : "#97a0b3",
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              {desc}
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

function actionButton(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function actionLink(isLight: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f8faff" : "#0d111b",
    color: isLight ? "#10131a" : "#fff",
    fontWeight: 800,
    textDecoration: "none",
  };
}
