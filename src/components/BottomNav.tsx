import React from "react";
import type { Tab } from "./WalletShell";

export default function BottomNav({
  tab,
  setTab,
  theme,
  lang,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  theme: "dark" | "light";
  lang: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: t.home },
    { id: "send", label: t.send },
    { id: "receive", label: t.receive },
    { id: "tokens", label: t.tokens },
    { id: "settings", label: t.settings },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        background: isLight ? "rgba(255,255,255,.96)" : "rgba(10,10,14,.96)",
        padding: "10px 12px 18px",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              height: 48,
              borderRadius: 14,
              border: `1px solid ${
                tab === item.id ? "#355ea8" : isLight ? "#dbe2f0" : "#252b39"
              }`,
              background:
                tab === item.id
                  ? "#1b2741"
                  : isLight
                  ? "#ffffff"
                  : "#141927",
              color: tab === item.id ? "#fff" : isLight ? "#10131a" : "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {item.label}
          </button>
        ))}
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
      settings: "Settings",
    },
    pt: {
      home: "Home",
      send: "Enviar",
      receive: "Receber",
      tokens: "Tokens",
      settings: "Config.",
    },
    es: {
      home: "Inicio",
      send: "Enviar",
      receive: "Recibir",
      tokens: "Tokens",
      settings: "Ajustes",
    },
  };

  return map[lang] || map.en;
}
