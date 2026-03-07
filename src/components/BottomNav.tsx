import React from "react";

export default function BottomNav({
  tab,
  setTab,
  theme = "dark",
}: {
  tab: string;
  setTab: (tab: any) => void;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";

  const items = [
    ["dashboard", "Home"],
    ["tokens", "Tokens"],
    ["nfts", "NFTs"],
    ["activity", "Activity"],
    ["settings", "Settings"],
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        background: isLight ? "#ffffff" : "#0f1420",
        borderTop: `1px solid ${isLight ? "#e4e8f0" : "#252b39"}`,
      }}
    >
      {items.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          style={{
            padding: 14,
            border: "none",
            background: "transparent",
            color: tab === id ? "#3f7cff" : isLight ? "#555" : "#aaa",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
