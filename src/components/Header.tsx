import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [avatar, setAvatar] = useState<string>(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
  const [open, setOpen] = useState(false);
  const [allNetworks, setAllNetworks] = useState<NetworkItem[]>(getAllNetworks());
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncNetwork = () => {
      setNetwork(getStoredNetwork());
      setAllNetworks(getAllNetworks());
    };
    const syncAvatar = () => setAvatar(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("storage", syncNetwork);
    window.addEventListener("wallet-network-updated", syncNetwork as EventListener);
    window.addEventListener("wallet-networks-updated", syncNetwork as EventListener);
    window.addEventListener("wallet-avatar-updated", syncAvatar as EventListener);
    document.addEventListener("mousedown", onClick);

    return () => {
      window.removeEventListener("storage", syncNetwork);
      window.removeEventListener("wallet-network-updated", syncNetwork as EventListener);
      window.removeEventListener("wallet-networks-updated", syncNetwork as EventListener);
      window.removeEventListener("wallet-avatar-updated", syncAvatar as EventListener);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const sortedNetworks = useMemo(
    () => [...allNetworks].sort((a, b) => a.name.localeCompare(b.name)),
    [allNetworks],
  );

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
            style={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0 }}
          />

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>{walletName}</div>
            <div style={{ fontSize: 13, color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.35 }}>
              {tr(lang, "header_subtitle")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
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
                  (e.currentTarget as HTMLImageElement).src = `${BASE}network-inri.png`;
                }}
                style={{ width: 18, height: 18, borderRadius: 9, objectFit: "contain", flexShrink: 0 }}
              />
              <span style={{ whiteSpace: "nowrap", maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}>
                {network.name} • {network.chainId}
              </span>
            </button>

            {open ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "min(340px, calc(100vw - 24px))",
                  maxHeight: 360,
                  overflowY: "auto",
                  border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                  background: isLight ? "#ffffff" : "#121621",
                  borderRadius: 18,
                  boxShadow: "0 16px 40px rgba(15,23,42,.22)",
                  padding: 10,
                  zIndex: 100,
                }}
              >
                {sortedNetworks.map((item) => (
                  <button
                    key={`${item.key}-${item.chainId}`}
                    onClick={() => {
                      saveStoredNetwork(item);
                      setNetwork(item);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                      borderRadius: 14,
                      border: "none",
                      background: item.chainId === network.chainId ? (isLight ? "#eef4ff" : "#16213b") : "transparent",
                      cursor: "pointer",
                      color: isLight ? "#10131a" : "#ffffff",
                    }}
                  >
                    <img
                      src={item.logo}
                      alt={item.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `${BASE}network-inri.png`;
                      }}
                      style={{ width: 24, height: 24, borderRadius: 12, objectFit: "contain" }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: isLight ? "#64748b" : "#94a3b8" }}>Chain ID {item.chainId}</div>
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
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}` }}
          />
        </div>
      </div>
    </header>
  );
}
