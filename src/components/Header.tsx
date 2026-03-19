import React, { useEffect, useState } from "react";
import { getAllNetworks, getStoredNetwork, saveStoredNetwork, type NetworkItem } from "../lib/network";
import { tr } from "../i18n/translations";

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
const FALLBACK_BRAND = `${BASE}pwa-192.png`;

export default function Header({
  walletName,
  theme = "dark",
  lang = "en",
}: {
  walletName: string;
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [networkOpen, setNetworkOpen] = useState(false);
  const [avatar, setAvatar] = useState<string>(
    localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR
  );

  useEffect(() => {
    const syncNetwork = () => setNetwork(getStoredNetwork());
    const syncAvatar = () =>
      setAvatar(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);

    window.addEventListener("storage", syncNetwork);
    window.addEventListener("wallet-network-updated", syncNetwork as EventListener);
    window.addEventListener("wallet-avatar-updated", syncAvatar as EventListener);

    const closeMenu = () => setNetworkOpen(false);
    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("storage", syncNetwork);
      window.removeEventListener("wallet-network-updated", syncNetwork as EventListener);
      window.removeEventListener("wallet-avatar-updated", syncAvatar as EventListener);
      window.removeEventListener("click", closeMenu);
    };
  }, []);

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
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <img
            src={BRAND_LOGO}
            alt="INRI"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallbackApplied) {
                img.dataset.fallbackApplied = "true";
                img.src = FALLBACK_BRAND;
              }
            }}
            style={{
              width: 48,
              height: 48,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                color: isLight ? "#10131a" : "#ffffff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {walletName}
            </div>

            <div
              style={{
                fontSize: 13,
                color: isLight ? "#5b6578" : "#97a0b3",
                lineHeight: 1.35,
              }}
            >
              {tr(lang, "header_subtitle")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setNetworkOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(63,124,255,.35)",
                background: "rgba(63,124,255,.12)",
                color: "#3f7cff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <img
                src={network.logo}
                alt={network.name}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallbackApplied) {
                    img.dataset.fallbackApplied = "true";
                    img.src = `${BASE}network-inri.png`;
                  }
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />

              <span style={{ whiteSpace: "nowrap" }}>
                {network.name} • {network.chainId}
              </span>
            </button>

            {networkOpen ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: 220,
                  background: isLight ? "#ffffff" : "#0f1624",
                  border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
                  borderRadius: 16,
                  boxShadow: isLight ? "0 18px 50px rgba(20,30,50,.15)" : "0 18px 50px rgba(0,0,0,.45)",
                  padding: 8,
                  zIndex: 100,
                }}
              >
                {getAllNetworks().map((item) => (
                  <button
                    key={item.chainId}
                    onClick={() => {
                      saveStoredNetwork(item);
                      setNetwork(item);
                      setNetworkOpen(false);
                      window.dispatchEvent(new Event("wallet-network-updated"));
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "none",
                      background: Number(item.chainId) === Number(network.chainId) ? (isLight ? "#eef4ff" : "#162138") : "transparent",
                      color: isLight ? "#10131a" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img src={item.logo} alt={item.name} style={{ width: 18, height: 18, borderRadius: 9, objectFit: "contain", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>Chain ID {item.chainId}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <img
            src={avatar}
            alt="avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{
              width: 44,
              height: 44,
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
