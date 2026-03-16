import React from "react";

export type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "activity"
  | "swap"
  | "bridge"
  | "settings";

export default function BottomNav({
  tab,
  setTab,
  theme = "dark",
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";

  const items: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Home" },
    { id: "send", label: "Send" },
    { id: "receive", label: "Receive" },
    { id: "tokens", label: "Tokens" },
    { id: "activity", label: "Activity" },
    { id: "swap", label: "Swap" },
    { id: "bridge", label: "Bridge" },
    { id: "settings", label: "Settings" },
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
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
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
                minHeight: 46,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
