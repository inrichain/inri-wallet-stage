import React from "react";
import type { Tab } from "./WalletShell";

export default function BottomNav({
  tab,
  setTab,
  theme = "dark",
  lang = "en",
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const items: Array<{ key: Tab; label: string }> = [
    { key: "dashboard", label: t.home },
    { key: "send", label: t.send },
    { key: "receive", label: t.receive },
    { key: "tokens", label: t.tokens },
    { key: "settings", label: t.settings },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        padding: "12px 14px calc(12px + env(safe-area-inset-bottom))",
        background: isLight ? "rgba(255,255,255,.84)" : "rgba(8,11,17,.84)",
        backdropFilter: "blur(16px)",
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#1d2638"}`,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 8,
        }}
      >
        {items.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                padding: "12px 8px",
                borderRadius: 16,
                border: active
                  ? "1px solid #4d7ef2"
                  : `1px solid ${isLight ? "#dbe2f0" : "#253047"}`,
                background: active
                  ? "#3f7cff"
                  : isLight
                  ? "#ffffff"
                  : "#101827",
                color: active ? "#ffffff" : isLight ? "#0f172a" : "#ffffff",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      home: "Home",
      send: "Send",
      receive: "Receive",
      tokens: "Tokens",
      settings: "Settings",
    },
    pt: {
      home: "Início",
      send: "Enviar",
      receive: "Receber",
      tokens: "Tokens",
      settings: "Ajustes",
    },
    es: {
      home: "Inicio",
      send: "Enviar",
      receive: "Recibir",
      tokens: "Tokens",
      settings: "Ajustes",
    },
    fr: {
      home: "Accueil",
      send: "Envoyer",
      receive: "Recevoir",
      tokens: "Tokens",
      settings: "Réglages",
    },
    de: {
      home: "Start",
      send: "Senden",
      receive: "Empfangen",
      tokens: "Tokens",
      settings: "Einstellungen",
    },
    ja: {
      home: "ホーム",
      send: "送信",
      receive: "受取",
      tokens: "トークン",
      settings: "設定",
    },
    zh: {
      home: "首页",
      send: "发送",
      receive: "接收",
      tokens: "代币",
      settings: "设置",
    },
  };

  return map[lang] || map.en;
}
