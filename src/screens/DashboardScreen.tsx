import React, { useEffect, useState } from "react";
import { getNativeBalance } from "../lib/inri";
import { getStoredNetwork, type NetworkItem } from "../lib/network";

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
  const t = getText(lang);

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      try {
        const value = network.key === "inri" ? await getNativeBalance(address || "") : "0.000000";
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
    ["send", t.send, t.sendDesc],
    ["receive", t.receive, t.receiveDesc],
    ["swap", t.swap, t.swapDesc],
    ["bridge", t.bridge, t.bridgeDesc],
    ["activity", t.activity, t.activityDesc],
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>{t.totalBalance}</div>
        <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8, color: isLight ? "#10131a" : "#ffffff", wordBreak: "break-word" }}>
          {balance} {network.symbol}
        </div>
        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: isLight ? "#eef4ff" : "#16213b", color: "#3f7cff", fontWeight: 800, fontSize: 13 }}>
          <img src={network.logo} alt={network.name} style={{ width: 18, height: 18, borderRadius: 9 }} />
          {network.name} • Chain {network.chainId}
        </div>
        <div style={{ marginTop: 12, color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, wordBreak: "break-all" }}>{address}</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <a href={network.explorerAddressUrl + address} target="_blank" rel="noreferrer" style={actionLink(isLight)}>{t.openExplorer}</a>
          {canInstall ? <button onClick={installApp} style={actionButton()}>{t.installApp}</button> : null}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {actions.map(([id, label, desc]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...card, cursor: "pointer", textAlign: "left", color: isLight ? "#10131a" : "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{label}</div>
            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
          </button>
        ))}
      </section>
    </div>
  );
}

function actionButton(): React.CSSProperties { return { padding: "10px 14px", borderRadius: 12, border: "none", background: "#3f7cff", color: "#fff", fontWeight: 800, cursor: "pointer" }; }
function actionLink(isLight: boolean): React.CSSProperties { return { padding: "10px 14px", borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#f8faff" : "#0d111b", color: isLight ? "#10131a" : "#fff", fontWeight: 800, textDecoration: "none" }; }
function getText(lang: string) {
  const map: Record<string, any> = {
    en: { totalBalance: "Total balance", send: "Send", receive: "Receive", swap: "Swap", bridge: "Bridge", activity: "Activity", sendDesc: "Native and ERC-20 transfers", receiveDesc: "QR code and wallet address", swapDesc: "Professional swap interface with premium token cards", bridgeDesc: "Polygon USDT ↔ INRI iUSD bridge flow", activityDesc: "Polished transaction history cards", openExplorer: "Open in Explorer", installApp: "Install App" },
    pt: { totalBalance: "Saldo total", send: "Enviar", receive: "Receber", swap: "Swap", bridge: "Bridge", activity: "Atividade", sendDesc: "Transferências nativas e ERC-20", receiveDesc: "QR code e endereço da carteira", swapDesc: "Interface profissional com cards premium de tokens", bridgeDesc: "Fluxo Polygon USDT ↔ INRI iUSD", activityDesc: "Cards refinados de histórico de transações", openExplorer: "Abrir no Explorer", installApp: "Instalar App" },
    es: { totalBalance: "Saldo total", send: "Enviar", receive: "Recibir", swap: "Swap", bridge: "Bridge", activity: "Actividad", sendDesc: "Transferencias nativas y ERC-20", receiveDesc: "Código QR y dirección", swapDesc: "Interfaz profesional con tarjetas premium de tokens", bridgeDesc: "Flujo Polygon USDT ↔ INRI iUSD", activityDesc: "Tarjetas pulidas de historial de transacciones", openExplorer: "Abrir en Explorer", installApp: "Instalar app" },
  };
  return map[lang] || map.en;
}
