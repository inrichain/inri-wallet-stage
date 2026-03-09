import React, { useEffect, useState } from "react";
import { getNativeBalance } from "../lib/inri";

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

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address]);

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
          {t.totalBalance}
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
          {balance} INRI
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
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {[
          ["send", t.send],
          ["receive", t.receive],
          ["swap", t.swap],
          ["bridge", t.bridge],
        ].map(([id, label]) => (
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
              }}
            >
              {t.open} {label}
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      totalBalance: "Total balance",
      send: "Send",
      receive: "Receive",
      swap: "Swap",
      bridge: "Bridge",
      open: "Open",
    },
    pt: {
      totalBalance: "Saldo total",
      send: "Enviar",
      receive: "Receber",
      swap: "Swap",
      bridge: "Bridge",
      open: "Abrir",
    },
    es: {
      totalBalance: "Saldo total",
      send: "Enviar",
      receive: "Recibir",
      swap: "Swap",
      bridge: "Bridge",
      open: "Abrir",
    },
    fr: {
      totalBalance: "Solde total",
      send: "Envoyer",
      receive: "Recevoir",
      swap: "Swap",
      bridge: "Bridge",
      open: "Ouvrir",
    },
    de: {
      totalBalance: "Gesamtsaldo",
      send: "Senden",
      receive: "Empfangen",
      swap: "Swap",
      bridge: "Bridge",
      open: "Öffnen",
    },
    it: {
      totalBalance: "Saldo totale",
      send: "Invia",
      receive: "Ricevi",
      swap: "Swap",
      bridge: "Bridge",
      open: "Apri",
    },
    ru: {
      totalBalance: "Общий баланс",
      send: "Отправить",
      receive: "Получить",
      swap: "Swap",
      bridge: "Bridge",
      open: "Открыть",
    },
    zh: {
      totalBalance: "总余额",
      send: "发送",
      receive: "接收",
      swap: "Swap",
      bridge: "Bridge",
      open: "打开",
    },
    ja: {
      totalBalance: "総残高",
      send: "送信",
      receive: "受取",
      swap: "Swap",
      bridge: "Bridge",
      open: "開く",
    },
    ko: {
      totalBalance: "총 잔액",
      send: "전송",
      receive: "수신",
      swap: "Swap",
      bridge: "Bridge",
      open: "열기",
    },
    tr: {
      totalBalance: "Toplam bakiye",
      send: "Gönder",
      receive: "Al",
      swap: "Swap",
      bridge: "Bridge",
      open: "Aç",
    },
  };
  return map[lang] || map.en;
}
