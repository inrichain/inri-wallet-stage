import React, { useEffect, useMemo, useState } from "react";
import { getNativeBalance, shortAddress } from "../lib/inri";
import { getNetworkById } from "../lib/networks";

export default function DashboardScreen({
  setTab,
  theme = "dark",
  lang = "en",
  address = "",
  activeNetworkId = "inri",
}: {
  setTab: (tab: any) => void;
  theme?: "dark" | "light";
  lang?: string;
  address?: string;
  activeNetworkId?: string;
}) {
  const [balance, setBalance] = useState("0.000000");
  const isLight = theme === "light";
  const t = getText(lang);
  const network = getNetworkById(activeNetworkId);

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      const value = await getNativeBalance(activeNetworkId, address || "");
      if (active) setBalance(value);
    }
    loadBalance();
    const timer = setInterval(loadBalance, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address, activeNetworkId]);

  const actions = useMemo(
    () => [
      ["send", t.send],
      ["receive", t.receive],
      ["swap", t.swap],
      ["bridge", t.bridge],
      ["tokens", t.tokens],
      ["activity", t.activity],
    ],
    [t]
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          borderRadius: 28,
          background: isLight
            ? "linear-gradient(180deg,#ffffff 0%, #f7faff 100%)"
            : "linear-gradient(180deg,#121827 0%, #0c1220 100%)",
          padding: 20,
          boxShadow: isLight
            ? "0 16px 40px rgba(40,56,90,.08)"
            : "0 16px 40px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: isLight ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: 800 }}>
              {t.totalBalance}
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8, color: isLight ? "#10131a" : "#ffffff", wordBreak: "break-word" }}>
              {balance} {network.nativeSymbol}
            </div>
            <div style={{ marginTop: 12, color: isLight ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: 700 }}>
              {network.name} • Chain ID {network.chainId}
            </div>
            <div style={{ marginTop: 10, color: isLight ? "#64748b" : "#94a3b8", fontSize: 13, wordBreak: "break-all" }}>
              {address ? shortAddress(address) : t.noAddress}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <img src={network.icon} alt={network.name} style={{ width: 86, height: 86, objectFit: "contain" }} />
            <div style={{ marginTop: 8, color: isLight ? "#64748b" : "#94a3b8", fontSize: 12, fontWeight: 800 }}>
              {network.nativeSymbol}
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {actions.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              borderRadius: 22,
              background: isLight ? "#ffffff" : "#101827",
              padding: 16,
              cursor: "pointer",
              textAlign: "left",
              boxShadow: isLight ? "0 10px 24px rgba(40,56,90,.05)" : "0 10px 24px rgba(0,0,0,.18)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#fff" }}>{label}</div>
            <div style={{ color: isLight ? "#64748b" : "#94a3b8", marginTop: 6, fontSize: 13 }}>{t.open} {label}</div>
          </button>
        ))}
      </section>
    </div>
  );
}

function getText(lang: string) {
  const map: any = {
    en: { totalBalance: "Total balance", send: "Send", receive: "Receive", swap: "Swap", bridge: "Bridge", tokens: "Tokens", activity: "Activity", open: "Open", noAddress: "No address" },
    pt: { totalBalance: "Saldo total", send: "Enviar", receive: "Receber", swap: "Swap", bridge: "Bridge", tokens: "Tokens", activity: "Atividade", open: "Abrir", noAddress: "Sem endereço" },
    es: { totalBalance: "Saldo total", send: "Enviar", receive: "Recibir", swap: "Swap", bridge: "Bridge", tokens: "Tokens", activity: "Actividad", open: "Abrir", noAddress: "Sin dirección" },
    fr: { totalBalance: "Solde total", send: "Envoyer", receive: "Recevoir", swap: "Swap", bridge: "Bridge", tokens: "Tokens", activity: "Activité", open: "Ouvrir", noAddress: "Aucune adresse" },
    de: { totalBalance: "Gesamtsaldo", send: "Senden", receive: "Empfangen", swap: "Swap", bridge: "Bridge", tokens: "Tokens", activity: "Aktivität", open: "Öffnen", noAddress: "Keine Adresse" },
    zh: { totalBalance: "总余额", send: "发送", receive: "接收", swap: "兑换", bridge: "桥接", tokens: "代币", activity: "活动", open: "打开", noAddress: "无地址" },
    ja: { totalBalance: "総残高", send: "送信", receive: "受取", swap: "スワップ", bridge: "ブリッジ", tokens: "トークン", activity: "履歴", open: "開く", noAddress: "アドレスなし" },
  };
  return map[lang] || map.en;
}
