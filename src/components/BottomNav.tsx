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

  const items: Array<{ id: Tab; label: string }> = [
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
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: isLight ? "rgba(255,255,255,.96)" : "rgba(15,20,32,.96)",
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        backdropFilter: "blur(12px)",
        padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {items.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                flex: "0 0 auto",
                minWidth: 92,
                padding: "12px 14px",
                borderRadius: 16,
                border: active
                  ? "1px solid #89a9ff"
                  : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                background: active
                  ? isLight
                    ? "#edf3ff"
                    : "#1b2b52"
                  : isLight
                  ? "#ffffff"
                  : "#111827",
                color: active ? "#3f7cff" : isLight ? "#334155" : "#d8dfef",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
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
  const map: Record<string, any> = {
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
    it: {
      home: "Home",
      send: "Invia",
      receive: "Ricevi",
      tokens: "Token",
      nfts: "NFT",
      activity: "Attività",
      settings: "Impostazioni",
    },
    ru: {
      home: "Главная",
      send: "Отправить",
      receive: "Получить",
      tokens: "Токены",
      nfts: "NFT",
      activity: "Активность",
      settings: "Настройки",
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
    ja: {
      home: "ホーム",
      send: "送信",
      receive: "受取",
      tokens: "トークン",
      nfts: "NFT",
      activity: "履歴",
      settings: "設定",
    },
    ko: {
      home: "홈",
      send: "전송",
      receive: "수신",
      tokens: "토큰",
      nfts: "NFT",
      activity: "활동",
      settings: "설정",
    },
    tr: {
      home: "Ana Sayfa",
      send: "Gönder",
      receive: "Al",
      tokens: "Tokenlar",
      nfts: "NFT",
      activity: "Aktivite",
      settings: "Ayarlar",
    },
  };

  return map[lang] || map.en;
}
