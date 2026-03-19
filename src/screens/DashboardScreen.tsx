import React, { useEffect, useMemo, useState } from "react";
import { getDefaultTokensForNetwork, loadAllBalances, type TokenItem } from "../lib/inri";
import { getStoredNetwork, type NetworkItem } from "../lib/network";
import { tr } from "../i18n/translations";

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

type DashboardToken = TokenItem & {
  balance: string;
};

type CustomToken = DashboardToken & {
  networkKey?: string;
};

const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";

function readCustomTokens() {
  try {
    const saved = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (!saved) return [] as CustomToken[];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as CustomToken[]) : [];
  } catch {
    return [] as CustomToken[];
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
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const isLight = theme === "light";

  const homeTokens = useMemo(() => {
    const defaults = getDefaultTokensForNetwork(network.key);
    const custom = readCustomTokens().filter((item) => !item.networkKey || item.networkKey === network.key);
    const merged = [...defaults, ...custom] as DashboardToken[];

    return merged.map((token) => ({
      ...token,
      balance: tokenBalances[token.symbol] || "0.000000",
    }));
  }, [network.key, tokenBalances]);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      try {
        const [balances] = await Promise.all([
          loadAllBalances(address || "", homeTokens, network.key),
        ]);

        if (!active) return;
        setBalance(balances[network.symbol] || balances[homeTokens[0]?.symbol || ""] || "0.000000");
        setTokenBalances(balances);
      } catch {
        if (!active) return;
        setBalance("0.000000");
        setTokenBalances({});
      }
    }

    loadHomeData();
    const timer = setInterval(loadHomeData, 8000);

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
  }, [address, network.key, homeTokens.length, network.symbol]);

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
          <img src={network.logo} alt={network.name} onError={(e)=>((e.currentTarget as HTMLImageElement).style.display="none")} style={{ width: 18, height: 18, borderRadius: 9 }} />
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

          <button onClick={() => setTab("send")} style={actionButton()}>
            {tr(lang, "dashboard_send")}
          </button>

          <button onClick={() => setTab("receive")} style={actionLink(isLight)}>
            {tr(lang, "dashboard_receive")}
          </button>

          <button onClick={() => setTab("settings")} style={actionLink(isLight)}>
            WalletConnect
          </button>

          {canInstall ? (
            <button onClick={installApp} style={actionButton()}>
              {tr(lang, "dashboard_install_app")}
            </button>
          ) : null}
        </div>
      </section>

      <section style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: isLight ? "#10131a" : "#ffffff" }}>
              {tr(lang, "nav_tokens")}
            </div>
            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginTop: 4 }}>
              {network.name}
            </div>
          </div>

          <button onClick={() => setTab("tokens")} style={actionLink(isLight)}>
            {tr(lang, "nav_tokens")}
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {homeTokens.map((token) => (
            <div
              key={token.symbol + (token.address || "native")}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "12px 0",
                borderBottom: `1px solid ${isLight ? "#edf1f7" : "#202635"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <img
                  src={token.logo}
                  alt={token.symbol}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    objectFit: "cover",
                    background: isLight ? "#f4f7fc" : "#0d111b",
                    flexShrink: 0,
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 16 }}>
                    {token.symbol}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isLight ? "#5b6578" : "#97a0b3",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 260,
                    }}
                  >
                    {token.subtitle}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 16 }}>
                {token.balance}
              </div>
            </div>
          ))}
        </div>
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
    cursor: "pointer",
  };
}
