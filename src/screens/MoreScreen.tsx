import React from "react";
import type { Tab } from "../lib/navigation";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";

const groups = [
  {
    title: "Actions",
    subtitle: "Daily wallet flows kept one tap away.",
    items: [
      { id: "send", title: "Send", subtitle: "Transfer native coin and tokens", icon: "↑" },
      { id: "receive", title: "Receive", subtitle: "Address, QR code and share", icon: "↓" },
      { id: "swap", title: "Swap", subtitle: "Token exchange flow", icon: "⇄" },
      { id: "bridge", title: "Bridge", subtitle: "Move assets across chains", icon: "⤴" },
      { id: "p2p", title: "P2P", subtitle: "Direct peer-to-peer trade flow", icon: "⇆" },
      { id: "pool", title: "Pool", subtitle: "Real-time mining and payout panel", icon: "◈" },
    ],
  },
  {
    title: "Portfolio",
    subtitle: "Track positions beyond the main tabs.",
    items: [
      { id: "nfts", title: "NFTs", subtitle: "Collectibles and media", icon: "✦" },
      { id: "staking", title: "Staking", subtitle: "Earn and track positions", icon: "◆" },
    ],
  },
  {
    title: "Connections & management",
    subtitle: "Power tools, network controls and wallet settings.",
    items: [
      { id: "walletconnect", title: "WalletConnect", subtitle: "Pair, scan and manage sessions", icon: "⌁" },
      { id: "networks", title: "Networks", subtitle: "Switch chains and manage RPCs", icon: "◎" },
      { id: "assets", title: "Asset Manager", subtitle: "Logos for networks, tokens and dapps", icon: "◌" },
      { id: "settings", title: "Settings", subtitle: "Theme, language, security and profile", icon: "⚙" },
    ],
  },
] as const;

export default function MoreScreen({ theme = "dark", setTab }: { theme?: "dark" | "light"; lang?: string; setTab: (tab: Tab) => void; }) {
  const isLight = theme === "light";

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="More" subtitle="Everything that should stay outside the main navigation lives here." theme={theme} />
        <div className="wallet-action-row">
          <StatusPill theme={theme} tone="primary">Power center</StatusPill>
          <StatusPill theme={theme}>Organized</StatusPill>
        </div>
      </ScreenCard>

      {groups.map((group) => (
        <ScreenCard key={group.title} theme={theme}>
          <SectionTitle title={group.title} subtitle={group.subtitle} theme={theme} compact />
          <div className="wallet-more-grid">
            {group.items.map((item) => (
              <button key={item.id} onClick={() => setTab(item.id as Tab)} className="wallet-more-tile" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635", color: isLight ? "#10131a" : "#ffffff" }}>
                <div className="wallet-more-tile-icon" style={{ background: isLight ? "#eef4ff" : "#162138" }}>{item.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{item.title}</div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{item.subtitle}</div>
                </div>
                <div style={{ color: "#3f7cff", fontSize: 18, fontWeight: 900 }}>›</div>
              </button>
            ))}
          </div>
        </ScreenCard>
      ))}
    </div>
  );
}
