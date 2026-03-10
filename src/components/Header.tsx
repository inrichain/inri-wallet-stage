import React, { useEffect, useState } from "react";
import { getStoredNetwork, type NetworkItem } from "../lib/network";

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

const BRAND_LOGO = "/inri-wallet-stage/brand-inri.png";
const FALLBACK_BRAND = "/inri-wallet-stage/favicon.png";

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
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

    return () => {
      window.removeEventListener("storage", syncNetwork);
      window.removeEventListener("wallet-network-updated", syncNetwork as EventListener);
      window.removeEventListener("wallet-avatar-updated", syncAvatar as EventListener);
    };
  }, []);

  return (
    <header
      style={{
        borderBottom: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        background: isLight ? "rgba(255,255,255,.92)" : "rgba(10,14,24,.92)",
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
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
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
              width: 56,
              height: 56,
              objectFit: "contain",
              flexShrink: 0,
              display: "block",
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
              Professional multichain wallet for the INRI ecosystem
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(63,124,255,.35)",
              background: "rgba(63,124,255,.12)",
              color: "#3f7cff",
              fontWeight: 800,
              fontSize: 14,
              minWidth: 0,
            }}
          >
            <img
              src={network.logo}
              alt={network.name}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackApplied) {
                  img.dataset.fallbackApplied = "true";
                  img.src = "/inri-wallet-stage/network-inri.png";
                }
              }}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                objectFit: "cover",
                flexShrink: 0,
                display: "block",
              }}
            />
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {network.name} • {network.chainId}
            </span>
          </div>

          <img
            src={avatar}
            alt="avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}`,
              flexShrink: 0,
              display: "block",
            }}
          />
        </div>
      </div>
    </header>
  );
}
