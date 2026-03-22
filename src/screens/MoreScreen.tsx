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
      { id: "pool", title: "Pool", subtitle: "INRI mining pool module", icon: "▣" },
    ],
  },
  {
    title: "Portfolio & ecosystem",
    subtitle: "The modules that make the wallet feel like a full INRI super app.",
    items: [
      { id: "nfts", title: "NFTs", subtitle: "Collectibles and media", icon: "✦" },
      { id: "staking", title: "Staking", subtitle: "Earn and track positions", icon: "◆" },
      { id: "governance", title: "Governance", subtitle: "Proposals and voting shell", icon: "◈" },
      { id: "claim", title: "Claim Center", subtitle: "Airdrops, rewards and claims", icon: "◉" },
    ],
  },
  {
    title: "Wallet management",
    subtitle: "Core wallet tools that should already exist before contracts are plugged in.",
    items: [
      { id: "accounts", title: "Accounts", subtitle: "Rename and organize vaults", icon: "☰" },
      { id: "contacts", title: "Contacts", subtitle: "Address book for send and bridge", icon: "♡" },
      { id: "walletconnect", title: "WalletConnect", subtitle: "Pair, scan and manage sessions", icon: "⌁" },
      { id: "sites", title: "Connected Sites", subtitle: "Permissions and live sessions", icon: "◌" },
      { id: "approvals", title: "Approvals", subtitle: "Approval manager shell", icon: "✓" },
    ],
  },
  {
    title: "System",
    subtitle: "Network controls, assets and app-level settings.",
    items: [
      { id: "networks", title: "Networks", subtitle: "Switch chains and manage RPCs", icon: "◎" },
      { id: "assets", title: "Asset Manager", subtitle: "Logos for networks, tokens and dapps", icon: "◌" },
      { id: "notifications", title: "Notifications", subtitle: "Prepare push and local alerts", icon: "◐" },
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
          <StatusPill theme={theme}>Complete shell</StatusPill>
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
