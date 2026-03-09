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

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const avatar = localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR;

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontWeight: 1000,
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: "-0.05em",
              color: "#5c8dff",
              textShadow: isLight ? "none" : "0 0 18px rgba(92,141,255,.18)",
            }}
          >
            WI
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>{walletName}</div>
            <div style={{ fontSize: 13, color: isLight ? "#5b6578" : "#97a0b3" }}>Professional multichain wallet for the INRI ecosystem</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(63,124,255,.35)", background: "rgba(63,124,255,.12)", color: "#3f7cff", fontWeight: 800, fontSize: 14 }}>
            <img src={network.logo} alt={network.name} style={{ width: 20, height: 20, borderRadius: 10, objectFit: "cover" }} />
            <span>{network.name} • {network.chainId}</span>
          </div>
          <img
            src={avatar}
            alt="avatar"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}` }}
          />
        </div>
      </div>
    </header>
  );
}
