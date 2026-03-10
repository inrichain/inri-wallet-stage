import React, { useEffect, useMemo, useState } from "react";
import { getStoredNetwork, type NetworkItem } from "../lib/network";

const DEFAULT_AVATAR = "/avatar.png";
const BRAND_LOGO = "/brand-inri.png";
const FALLBACK_BRAND = "/favicon.png";

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());

  const avatar = useMemo(() => {
    return localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR;
  }, []);

  useEffect(() => {
    const sync = () => setNetwork(getStoredNetwork());
    window.addEventListener("storage", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
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
                  img.src = "/network-inri.png";
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
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {network.name} • {network.chainId}
            </span>
          </div>

          <img
            src={avatar}
            alt="avatar"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallbackApplied) {
                img.dataset.fallbackApplied = "true";
                img.src = DEFAULT_AVATAR;
              }
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
