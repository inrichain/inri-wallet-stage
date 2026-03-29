import React, { useEffect, useMemo, useState } from "react";
import { getDefaultTokensForNetwork, loadAllBalances, type TokenItem } from "../lib/inri";
import { getStoredNetwork, type NetworkItem } from "../lib/network";
import { tr } from "../i18n/translations";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import LogoImage from "../components/LogoImage";

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

type DashboardToken = TokenItem & { balance: string };
type CustomToken = DashboardToken & { networkKey?: string };
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

export default function DashboardScreen({ setTab, theme = "dark", lang = "en", address = "" }: { setTab: (tab: any) => void; theme?: "dark" | "light"; lang?: string; address?: string; }) {
  const [balance, setBalance] = useState("0.000000");
  const [canInstall, setCanInstall] = useState(false);
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const isLight = theme === "light";

  const homeTokens = useMemo(() => {
    const defaults = getDefaultTokensForNetwork(network.key);
    const custom = readCustomTokens().filter((item) => !item.networkKey || item.networkKey === network.key);
    const merged = [...defaults, ...custom] as DashboardToken[];
    return merged.map((token) => ({ ...token, balance: tokenBalances[token.symbol] || "0.000000" }));
  }, [network.key, tokenBalances]);

  useEffect(() => {
    let active = true;
    async function loadHomeData() {
      try {
        const [balances] = await Promise.all([loadAllBalances(address || "", homeTokens, network.key)]);
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
    const handler = (e: any) => { e.preventDefault(); window.deferredPrompt = e; setCanInstall(true); };
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

  function openWalletConnect() {
    window.dispatchEvent(new CustomEvent("wallet-open-wc", { detail: { source: "dashboard" } }));
    setTab("walletconnect");
  }

  async function installApp() {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    window.deferredPrompt = null;
    setCanInstall(false);
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme} className="wallet-home-hero">
        <SectionTitle
          title={tr(lang, "dashboard_total_balance")}
          subtitle={address ? address : "Wallet not available yet"}
          theme={theme}
          compact
          actions={<StatusPill theme={theme} tone="primary">{network.symbol}</StatusPill>}
        />

        <div style={{ fontSize: 34, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", wordBreak: "break-word", lineHeight: 1.05 }}>
          {balance} {network.symbol}
        </div>

        <div className="wallet-home-meta-row">
          <div className="wallet-mini-stat" style={{ background: isLight ? "#eef4ff" : "#16213b", color: "#3f7cff" }}>
            <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} symbol={network.symbol} size={18} />
            <span>{network.name}</span>
            <span style={{ opacity: 0.72 }}>•</span>
            <span>Chain {network.chainId}</span>
          </div>
        </div>

        <div className="wallet-home-actions-grid wallet-home-actions-grid-single">
          <ActionButton onClick={() => setTab("send")} theme={theme} tone="primary" compact>{tr(lang, "dashboard_send")}</ActionButton>
          <ActionButton onClick={() => setTab("receive")} theme={theme} compact>{tr(lang, "dashboard_receive")}</ActionButton>
          <ActionButton onClick={openWalletConnect} theme={theme} compact>⌁ WalletConnect</ActionButton>
          <ActionButton onClick={() => setTab("p2p")} theme={theme} tone="ghost" compact>P2P</ActionButton>
          <ActionButton onClick={() => setTab("staking")} theme={theme} tone="ghost" compact>Staking</ActionButton>
          <ActionButton onClick={() => setTab("pool")} theme={theme} tone="ghost" compact>Pool</ActionButton>
        </div>

        {canInstall ? (
          <div className="wallet-action-row">
            <button onClick={installApp} className="wallet-link-chip" type="button">
              {tr(lang, "dashboard_install_app")}
            </button>
          </div>
        ) : null}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle
          title={tr(lang, "nav_tokens")}
          subtitle={network.name}
          theme={theme}
          actions={<ActionButton onClick={() => setTab("tokens")} theme={theme} compact>{tr(lang, "nav_tokens")}</ActionButton>}
        />

        {!homeTokens.length ? (
          <EmptyState theme={theme} title="No tokens yet" description="Add custom assets or switch network to populate your portfolio." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {homeTokens.slice(0, 6).map((token) => (
              <div key={token.symbol + (token.address || "native")} className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <LogoImage src={token.logo} alt={token.symbol} kind="token" label={token.symbol} symbol={token.symbol} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 16 }}>{token.symbol}</div>
                    <div className="wallet-ui-subtle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>{token.subtitle}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 16, textAlign: "right", overflowWrap: "anywhere" }}>{token.balance}</div>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>
    </div>
  );
}
