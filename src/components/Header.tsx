import React, { useEffect, useMemo, useState } from "react";
import { getAllNetworks, getStoredNetwork, saveStoredNetwork, type NetworkItem } from "../lib/network";
import { tr } from "../i18n/translations";
import LogoImage from "./LogoImage";

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

  useEffect(() => {
    const syncNetwork = () => setNetwork(getStoredNetwork());
    const syncAvatar = () => setAvatar(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
    const closeMenu = () => setNetworkOpen(false);
    window.addEventListener("storage", syncNetwork);
    window.addEventListener("wallet-network-updated", syncNetwork as EventListener);
    window.addEventListener("wallet-avatar-updated", syncAvatar as EventListener);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("storage", syncNetwork);
      window.removeEventListener("wallet-network-updated", syncNetwork as EventListener);
      window.removeEventListener("wallet-avatar-updated", syncAvatar as EventListener);
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  const filteredNetworks = useMemo(() => {
    const q = networkQuery.trim().toLowerCase();
    const items = getAllNetworks();
    if (!q) return items;
    return items.filter((item) => [item.name, item.symbol, String(item.chainId)].join(" ").toLowerCase().includes(q));
  }, [networkQuery, network.chainId]);

  return (
    <header
      style={{
        borderBottom: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        background: isLight ? "rgba(255,255,255,.94)" : "rgba(10,14,24,.94)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "12px 16px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <LogoImage src={BRAND_LOGO} alt="INRI" kind="dapp" label="INRI" size={44} rounded={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: isLight ? "#10131a" : "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {walletName}
            </div>
            <div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.35 }}>
              {tr(lang, "header_subtitle")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setNetworkOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(63,124,255,.35)",
                background: "rgba(63,124,255,.12)",
                color: "#3f7cff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                maxWidth: 190,
              }}
            >
              <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} symbol={network.symbol} size={20} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{network.name}</span>
            </button>

            {networkOpen ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  width: "min(360px, calc(100vw - 32px))",
                  background: isLight ? "#ffffff" : "#0f1624",
                  border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
                  borderRadius: 18,
                  boxShadow: isLight ? "0 18px 50px rgba(20,30,50,.15)" : "0 18px 50px rgba(0,0,0,.45)",
                  padding: 10,
                  zIndex: 100,
                  maxHeight: "min(520px, calc(100vh - 120px))",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <input
                  value={networkQuery}
                  onChange={(e) => setNetworkQuery(e.target.value)}
                  placeholder="Search network, symbol or chain ID"
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "11px 12px",
                    borderRadius: 14,
                    border: `1px solid ${isLight ? "#d7e0ee" : "#2b3950"}`,
                    background: isLight ? "#f7fafe" : "#0d1420",
                    color: isLight ? "#10131a" : "#fff",
                    outline: "none",
                  }}
                />
                <div style={{ display: "grid", gap: 6 }}>
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
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 12px",
                          borderRadius: 14,
                          border: active ? "1px solid rgba(63,124,255,.36)" : "1px solid transparent",
                          background: active ? (isLight ? "#eef4ff" : "#162138") : "transparent",
                          color: isLight ? "#10131a" : "#ffffff",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={24} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>Chain ID {item.chainId} • {item.symbol}{item.isCustom ? " • Custom" : ""}</div>
                        </div>
                        {active ? <span style={{ fontSize: 12, fontWeight: 800, color: "#3f7cff" }}>ACTIVE</span> : null}
                      </button>
                    );
                  })}
                  {!filteredNetworks.length ? <div style={{ padding: 12, color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>No networks found.</div> : null}
                </div>
              </div>
            ) : null}
          </div>

          <button
            onClick={onOpenSettings}
            title={tr(lang, "nav_settings")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: isLight ? "#ffffff" : "#12182a",
              color: isLight ? "#334155" : "#cfd6e4",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ⚙
          </button>

          <img
            src={avatar}
            alt="avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}`,
            }}
          />
        </div>
      </div>
    </header>
  );
}
