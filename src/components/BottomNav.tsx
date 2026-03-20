import React from "react";
import { tr } from "../i18n/translations";
import { MORE_TABS, type Tab } from "../lib/navigation";

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

  const items: { id: Tab; label: string; icon: string; active?: boolean }[] = [
    { id: "dashboard", label: tr(lang, "nav_home"), icon: "⌂" },
    { id: "tokens", label: tr(lang, "nav_tokens"), icon: "◈" },
    { id: "activity", label: tr(lang, "nav_activity"), icon: "↻" },
    { id: "more", label: "More", icon: "⋯", active: MORE_TABS.includes(tab) },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: isLight ? "rgba(255,255,255,.98)" : "rgba(9,13,22,.98)",
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#1e2535"}`,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          alignItems: "stretch",
        }}
      >
        {items.map((item) => {
          const active = item.active ?? tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              title={item.label}
              style={{
                padding: "10px 6px",
                borderRadius: 16,
                border: active
                  ? "1px solid #4d7ef2"
                  : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                background: active ? "#3f7cff" : isLight ? "#f8f9ff" : "#12182a",
                color: active ? "#ffffff" : isLight ? "#334155" : "#cfd6e4",
                fontWeight: 800,
                fontSize: 11,
                cursor: "pointer",
                minHeight: 54,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
