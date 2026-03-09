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
    { id: "swap", label: t.swap },
    { id: "bridge", label: t.bridge },
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
        background: isLight ? "rgba(255,255,255,.96)" : "rgba(11,15,26,.96)",
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#1e2535"}`,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
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
                padding: "10px 6px",
                borderRadius: 14,
                border: active
                  ? "1px solid #4d7ef2"
                  : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                background: active ? "#3f7cff" : isLight ? "#f8f9ff" : "#12182a",
                color: active ? "#ffffff" : isLight ? "#334155" : "#cfd6e4",
                fontWeight: 800,
                fontSize: 11,
                cursor: "pointer",
                transition: "all .15s ease",
                minHeight: 46,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={item.label}
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
    en: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    pt: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    es: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    fr: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    de: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    it: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    ru: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    zh: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    ja: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    ko: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
    tr: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", swap: "Swap", bridge: "Bridge", settings: "Settings" },
  };

  return map[lang] || map.en;
}
