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
      { id: "pool", title: "Pool", subtitle: "Mining pool module", icon: "◈" },
    ],
  },
  {
    title: "Wallet",
    subtitle: "Accounts, contacts, permissions and connections.",
    items: [
      { id: "accounts", title: "Accounts", subtitle: "Manage local wallets", icon: "◫" },
      { id: "contacts", title: "Contacts", subtitle: "Saved addresses and notes", icon: "☏" },
      { id: "walletconnect", title: "WalletConnect", subtitle: "Pair, scan and manage sessions", icon: "⌁" },
      { id: "connected-sites", title: "Connected Sites", subtitle: "Review dapp permissions", icon: "◎" },
      { id: "approvals", title: "Approvals", subtitle: "Track token allowances", icon: "✓" },
      { id: "networks", title: "Networks", subtitle: "Switch chains and manage RPCs", icon: "◉" },
      { id: "assets", title: "Asset Manager", subtitle: "Logos for networks, tokens and dapps", icon: "◌" },
    ],
  },
  {
    title: "Ecosystem & app",
    subtitle: "Modules that turn the wallet into the INRI super app.",
    items: [
      { id: "governance", title: "Governance", subtitle: "Proposals and voting", icon: "⚑" },
      { id: "claim-center", title: "Claim Center", subtitle: "Airdrops and rewards", icon: "✦" },
      { id: "notifications", title: "Notifications", subtitle: "Preference center", icon: "✉" },
      { id: "nfts", title: "NFTs", subtitle: "Collectibles and media", icon: "✦" },
      { id: "staking", title: "Staking", subtitle: "Earn and track positions", icon: "◆" },
      { id: "settings", title: "Settings", subtitle: "Theme, language, security and profile", icon: "⚙" },
    ],
  },
] as const;

export default function MoreScreen({ theme = "dark", setTab }: { theme?: "dark" | "light"; lang?: string; setTab: (tab: Tab) => void; }) {
  const isLight = theme === "light";
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="More" subtitle="Everything outside the main navigation lives here in one organized place." theme={theme} />
        <div className="wallet-action-row">
          <StatusPill theme={theme} tone="primary">Power center</StatusPill>
          <StatusPill theme={theme}>Expanded</StatusPill>
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
