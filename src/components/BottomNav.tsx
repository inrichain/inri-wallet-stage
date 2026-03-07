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

  const items: { id: Tab; label: string }[] = [
    { id: "dashboard", label: t.home },
    { id: "send", label: t.send },
    { id: "receive", label: t.receive },
    { id: "tokens", label: t.tokens },
    { id: "nfts", label: t.nfts },
    { id: "activity", label: t.activity },
    { id: "settings", label: t.settings },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: isLight ? "#ffffff" : "#0b0f1a",
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#1e2535"}`,
        padding: "10px 12px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
          gap: 8,
        }}
      >
        {items.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                padding: "12px 10px",
                borderRadius: 14,
                border: active
                  ? "1px solid #4d7ef2"
                  : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                background: active
                  ? "#3f7cff"
                  : isLight
                  ? "#f8f9ff"
                  : "#12182a",
                color: active
                  ? "#ffffff"
                  : isLight
                  ? "#334155"
                  : "#cfd6e4",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "all .15s ease",
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
  const map: any = {
    en: {
      home: "Home",
      send: "Send",
      receive: "Receive",
      tokens: "Tokens",
      nfts: "NFTs",
      activity: "Activity",
      settings: "Settings",
    },

    pt: {
      home: "Início",
      send: "Enviar",
      receive: "Receber",
      tokens: "Tokens",
      nfts: "NFTs",
      activity: "Atividade",
      settings: "Config",
    },

    es: {
      home: "Inicio",
      send: "Enviar",
      receive: "Recibir",
      tokens: "Tokens",
      nfts: "NFTs",
      activity: "Actividad",
      settings: "Ajustes",
    },

    fr: {
      home: "Accueil",
      send: "Envoyer",
      receive: "Recevoir",
      tokens: "Tokens",
      nfts: "NFTs",
      activity: "Activité",
      settings: "Réglages",
    },

    de: {
      home: "Start",
      send: "Senden",
      receive: "Empfangen",
      tokens: "Tokens",
      nfts: "NFTs",
      activity: "Aktivität",
      settings: "Einstellungen",
    },

    ja: {
      home: "ホーム",
      send: "送信",
      receive: "受信",
      tokens: "トークン",
      nfts: "NFT",
      activity: "履歴",
      settings: "設定",
    },

    zh: {
      home: "首页",
      send: "发送",
      receive: "接收",
      tokens: "代币",
      nfts: "NFT",
      activity: "活动",
      settings: "设置",
    },
  };

  return map[lang] || map.en;
}
