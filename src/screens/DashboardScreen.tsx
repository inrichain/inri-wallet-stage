import React, { useEffect, useState } from "react";
import { EXPLORER_ADDRESS_URL, getNativeBalance } from "../lib/inri";

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
  const isLight = theme === "light";
  const t = getText(lang);

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      try {
        const value = await getNativeBalance(address || "");
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
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", handler as any);
    };
  }, [address]);

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
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>{t.totalBalance}</div>
        <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8, color: isLight ? "#10131a" : "#ffffff", wordBreak: "break-word" }}>
          {balance} INRI
        </div>
        <div style={{ marginTop: 12, color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, wordBreak: "break-all" }}>{address}</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <a href={EXPLORER_ADDRESS_URL + address} target="_blank" rel="noreferrer" style={actionLink(isLight)}>{t.openExplorer}</a>
          {canInstall ? <button onClick={installApp} style={actionButton()}>{t.installApp}</button> : null}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {actions.map(([id, label, desc]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...card, cursor: "pointer", textAlign: "left", color: isLight ? "#10131a" : "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{label}</div>
            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginTop: 6 }}>{desc}</div>
          </button>
        ))}
      </section>
    </div>
  );
}

function actionButton(): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, border: "none", background: "#3f7cff", color: "#fff", fontWeight: 800, cursor: "pointer" };
}
function actionLink(isLight: boolean): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#f8faff" : "#0d111b", color: isLight ? "#10131a" : "#fff", fontWeight: 800, textDecoration: "none" };
}
function getText(lang: string) {
  const map: Record<string, any> = {
    en: { totalBalance: "Total balance", send: "Send", receive: "Receive", swap: "Swap", bridge: "Bridge", sendDesc: "Native and ERC-20 transfers", receiveDesc: "QR code and wallet address", swapDesc: "Professional UI ready for router config", bridgeDesc: "Professional UI ready for bridge config", openExplorer: "Open in Explorer", installApp: "Install App" },
    pt: { totalBalance: "Saldo total", send: "Enviar", receive: "Receber", swap: "Swap", bridge: "Bridge", sendDesc: "Transferências nativas e ERC-20", receiveDesc: "QR code e endereço da carteira", swapDesc: "Interface pronta para configurar o roteador", bridgeDesc: "Interface pronta para configurar o bridge", openExplorer: "Abrir no Explorer", installApp: "Instalar App" },
    es: { totalBalance: "Saldo total", send: "Enviar", receive: "Recibir", swap: "Swap", bridge: "Bridge", sendDesc: "Transferencias nativas y ERC-20", receiveDesc: "Código QR y dirección", swapDesc: "Interfaz lista para configurar el router", bridgeDesc: "Interfaz lista para configurar el bridge", openExplorer: "Abrir en Explorer", installApp: "Instalar app" },
  };
  return map[lang] || map.en;
}
