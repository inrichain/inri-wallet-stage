import React from "react";

const BASE = "/inri-wallet-stage/";
const DEFAULT_AVATAR = BASE + "avatar.png";

export default function Header({
  walletName,
  theme = "dark",
  subtitle,
}: {
  walletName: string;
  theme?: "dark" | "light";
  subtitle?: string;
}) {
  const isLight = theme === "light";
  const avatar = localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR;

  return (
    <header
      style={{
        borderBottom: `1px solid ${isLight ? "#d9e2f2" : "#1d2840"}`,
        background: isLight ? "rgba(255,255,255,.86)" : "rgba(8,12,20,.86)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "16px 16px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <img
            src={BASE + "token-inri.png"}
            alt="INRI"
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              flex: "0 0 auto",
              filter: isLight
                ? "drop-shadow(0 10px 22px rgba(20,184,255,.16))"
                : "drop-shadow(0 12px 28px rgba(20,184,255,.24))",
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: isLight ? "#09111f" : "#ffffff",
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
                color: isLight ? "#5d6a84" : "#96a6c6",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle || "INRI Wallet • Mainnet ready"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: `1px solid ${isLight ? "rgba(31,211,138,.25)" : "rgba(31,211,138,.22)"}`,
              background: isLight ? "rgba(31,211,138,.08)" : "rgba(31,211,138,.10)",
              color: "#1fd38a",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            3777
          </div>

          <img
            src={avatar}
            alt="Avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${isLight ? "#d9e2f2" : "#263757"}`,
              background: isLight ? "#f7faff" : "#121b2e",
            }}
          />
        </div>
      </div>
    </header>
  );
}
