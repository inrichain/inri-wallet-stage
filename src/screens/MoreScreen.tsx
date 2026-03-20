import React from "react";
import type { Tab } from "../lib/navigation";

const groups = [
  {
    title: "Actions",
    items: [
      { id: "send", title: "Send", subtitle: "Transfer native coin and tokens", icon: "↑" },
      { id: "receive", title: "Receive", subtitle: "Address, QR code and share", icon: "↓" },
      { id: "swap", title: "Swap", subtitle: "Token exchange flow", icon: "⇄" },
      { id: "bridge", title: "Bridge", subtitle: "Move assets across chains", icon: "⤴" },
    ],
  },
  {
    title: "Portfolio",
    items: [
      { id: "nfts", title: "NFTs", subtitle: "Collectibles and media", icon: "✦" },
      { id: "staking", title: "Staking", subtitle: "Earn and track positions", icon: "◆" },
    ],
  },
  {
    title: "Connections & management",
    items: [
      { id: "walletconnect", title: "WalletConnect", subtitle: "Pair, scan and manage sessions", icon: "⌁" },
      { id: "networks", title: "Networks", subtitle: "Switch chains and manage RPCs", icon: "◎" },
      { id: "assets", title: "Asset Manager", subtitle: "Logos for networks, tokens and dapps", icon: "◌" },
      { id: "settings", title: "Settings", subtitle: "Theme, language, security and profile", icon: "⚙" },
    ],
  },
] as const;

export default function MoreScreen({
  theme = "dark",
  setTab,
}: {
  theme?: "dark" | "light";
  lang?: string;
  setTab: (tab: Tab) => void;
}) {
  const isLight = theme === "light";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={{ fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>More</div>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginTop: 6, lineHeight: 1.5 }}>
          Centralize everything that should stay out of the main navigation. This keeps Home, Tokens and Activity clean while preserving all wallet functions.
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.title} style={cardStyle(isLight)}>
          <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", marginBottom: 12 }}>{group.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {group.items.map((item) => (
              <button key={item.id} onClick={() => setTab(item.id as Tab)} style={tileStyle(isLight)}>
                <div style={iconStyle(isLight)}>{item.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: isLight ? "#10131a" : "#ffffff" }}>{item.title}</div>
                  <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{item.subtitle}</div>
                </div>
                <div style={{ color: "#3f7cff", fontSize: 18, fontWeight: 900 }}>›</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}

function tileStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "44px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`,
    background: isLight ? "#f8fbff" : "#0f1520",
    cursor: "pointer",
    textAlign: "left",
  };
}

function iconStyle(isLight: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 18,
    background: isLight ? "#eef4ff" : "#162138",
    color: "#3f7cff",
  };
}
