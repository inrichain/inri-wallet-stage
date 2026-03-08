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

  const items: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: t.home, icon: "⌂" },
    { id: "send", label: t.send, icon: "↑" },
    { id: "receive", label: t.receive, icon: "↓" },
    { id: "activity", label: t.activity, icon: "◷" },
    { id: "settings", label: t.settings, icon: "⚙" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 80,
        padding: "0 10px calc(12px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none",
      }}
    >
      <div className="inri-app-shell">
        <div
          className="inri-glass"
          style={{
            pointerEvents: "auto",
            borderRadius: 26,
            padding: 8,
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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
                  border: "none",
                  outline: "none",
                  minHeight: 64,
                  borderRadius: 18,
                  background: active
                    ? isLight
                      ? "linear-gradient(180deg,#4f7cff 0%, #3f73ff 100%)"
                      : "linear-gradient(180deg,rgba(79,124,255,.95) 0%, rgba(122,92,255,.92) 100%)"
                    : "transparent",
                  color: active ? "#ffffff" : isLight ? "#475569" : "#97a0b3",
                  display: "grid",
                  placeItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  boxShadow: active
                    ? isLight
                      ? "0 14px 26px rgba(79,124,255,.24)"
                      : "0 14px 30px rgba(79,124,255,.24)"
                    : "none",
                  transition: "all .18s ease",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 12 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
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
      activity: "Activity",
      settings: "Settings",
    },
    pt: {
      home: "Início",
      send: "Enviar",
      receive: "Receber",
      activity: "Atividade",
      settings: "Config",
    },
    es: {
      home: "Inicio",
      send: "Enviar",
      receive: "Recibir",
      activity: "Actividad",
      settings: "Ajustes",
    },
    fr: {
      home: "Accueil",
      send: "Envoyer",
      receive: "Recevoir",
      activity: "Activité",
      settings: "Réglages",
    },
    de: {
      home: "Start",
      send: "Senden",
      receive: "Empfangen",
      activity: "Aktivität",
      settings: "Einstellungen",
    },
    ja: {
      home: "ホーム",
      send: "送信",
      receive: "受信",
      activity: "履歴",
      settings: "設定",
    },
    zh: {
      home: "首页",
      send: "发送",
      receive: "接收",
      activity: "活动",
      settings: "设置",
    },
  };

  return map[lang] || map.en;
}
