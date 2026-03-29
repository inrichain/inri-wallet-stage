import React, { useEffect, useMemo, useState } from "react";
import { getAllNetworks, getStoredNetwork, saveStoredNetwork, type NetworkItem } from "../lib/network";
import { tr } from "../i18n/translations";
import LogoImage from "./LogoImage";
import StatusPill from "./StatusPill";

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3f7cff"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="60" fill="#0f172a"/>
  <circle cx="60" cy="44" r="22" fill="#ffffff" opacity="0.95"/>
  <path d="M24 102c7-18 21-28 36-28s29 10 36 28" fill="#ffffff" opacity="0.95"/>
  <circle cx="60" cy="60" r="54" fill="none" stroke="url(#g)" stroke-width="6"/>
</svg>
`)}`;

const BASE = import.meta.env.BASE_URL || "/";
const BRAND_LOGO = `${BASE}brand-inri.png`;

export default function Header({
  walletName,
  theme = "dark",
  lang = "en",
  onOpenSettings,
}: {
  walletName: string;
  theme?: "dark" | "light";
  lang?: string;
  onOpenSettings?: () => void;
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [networkOpen, setNetworkOpen] = useState(false);
  const [networkQuery, setNetworkQuery] = useState("");
  const [avatar, setAvatar] = useState<string>(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
  const [isCompact, setIsCompact] = useState(() => window.innerWidth <= 760);

  useEffect(() => {
    const syncNetwork = () => setNetwork(getStoredNetwork());
    const syncAvatar = () => setAvatar(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
    const closeMenu = () => setNetworkOpen(false);
    const onResize = () => setIsCompact(window.innerWidth <= 760);
    window.addEventListener("storage", syncNetwork);
    window.addEventListener("wallet-network-updated", syncNetwork as EventListener);
    window.addEventListener("wallet-avatar-updated", syncAvatar as EventListener);
    window.addEventListener("wallet-force-close-overlays", closeMenu as EventListener);
    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("storage", syncNetwork);
      window.removeEventListener("wallet-network-updated", syncNetwork as EventListener);
      window.removeEventListener("wallet-avatar-updated", syncAvatar as EventListener);
      window.removeEventListener("wallet-force-close-overlays", closeMenu as EventListener);
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const filteredNetworks = useMemo(() => {
    const q = networkQuery.trim().toLowerCase();
    const items = getAllNetworks();
    if (!q) return items;
    return items.filter((item) => [item.name, item.symbol, String(item.chainId)].join(" ").toLowerCase().includes(q));
  }, [networkQuery, network.chainId]);

  const inputClass = `wallet-ui-input ${isLight ? "light" : ""}`.trim();

  const networkPanel = (
    <div
      className={isCompact ? "wallet-network-drawer" : "wallet-network-popover"}
      style={{
        background: isLight ? "#ffffff" : "#0f1624",
        border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
        boxShadow: isLight ? "0 18px 50px rgba(20,30,50,.15)" : "0 18px 50px rgba(0,0,0,.45)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="wallet-network-panel-head">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>Networks</div>
          <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>Choose the active chain for this wallet.</div>
        </div>
        {isCompact ? <button className="wallet-icon-btn" onClick={() => setNetworkOpen(false)} style={{ width: 38, height: 38 }}>✕</button> : null}
      </div>

      <input
        value={networkQuery}
        onChange={(e) => setNetworkQuery(e.target.value)}
        placeholder="Search network, symbol or chain ID"
        className={inputClass}
        style={{ marginBottom: 10 }}
      />

      <div style={{ display: "grid", gap: 8 }}>
        {filteredNetworks.map((item) => {
          const active = Number(item.chainId) === Number(network.chainId);
          return (
            <button
              key={item.chainId}
              onClick={() => {
                saveStoredNetwork(item);
                setNetwork(item);
                setNetworkOpen(false);
                setNetworkQuery("");
                window.dispatchEvent(new Event("wallet-network-updated"));
              }}
              className="wallet-network-option"
              style={{
                border: active ? "1px solid rgba(63,124,255,.38)" : `1px solid ${isLight ? "#e6ecf5" : "#202635"}`,
                background: active ? (isLight ? "#eef4ff" : "#162138") : (isLight ? "#f8fbff" : "#0f1520"),
                color: isLight ? "#10131a" : "#ffffff",
              }}
            >
              <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={24} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div className="wallet-ui-subtle">Chain ID {item.chainId} • {item.symbol}{item.isCustom ? " • Custom" : ""}</div>
              </div>
              {active ? <StatusPill theme={theme} tone="primary">ACTIVE</StatusPill> : null}
            </button>
          );
        })}
        {!filteredNetworks.length ? <div className="wallet-ui-subtle" style={{ padding: 12 }}>No networks found.</div> : null}
      </div>
    </div>
  );

  return (
    <header
      style={{
        borderBottom: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        background: isLight ? "#ffffff" : "#0b1020",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div className="wallet-header-shell wallet-mobile-scroll-fix">
        <div className="wallet-header-top-row">
          <div className="wallet-header-brand">
            <LogoImage src={BRAND_LOGO} alt="INRI" kind="dapp" label="INRI" size={isCompact ? 38 : 44} rounded={false} />
            <div style={{ minWidth: 0 }}>
              <div className="wallet-header-title">{walletName}</div>
              <div className="wallet-header-subtitle">{tr(lang, "header_subtitle")}</div>
            </div>
          </div>

          <button onClick={onOpenSettings} className="wallet-header-avatar-btn wallet-header-settings-fab" title={tr(lang, "nav_settings") || "Settings"}>
            <img
              src={avatar}
              alt="avatar"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <span className="wallet-header-avatar-gear">⚙</span>
          </button>
        </div>

        <div className="wallet-header-actions">
          <div className="wallet-header-network-wrap" style={{ position: isCompact ? "static" : "relative" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setNetworkOpen((prev) => !prev)} className="wallet-network-trigger" title={network.name}>
              <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} symbol={network.symbol} size={18} />
              <span className="wallet-header-network-content">
                <span className="wallet-header-network-name">{network.name}</span>
                <span className="wallet-header-network-meta">Chain {network.chainId}</span>
              </span>
              <span className="wallet-header-network-caret">▾</span>
            </button>
            {!isCompact && networkOpen ? networkPanel : null}
          </div>
        </div>
      </div>

      {isCompact && networkOpen ? <div className="wallet-network-overlay" onClick={() => setNetworkOpen(false)}>{networkPanel}</div> : null}
    </header>
  );
}
