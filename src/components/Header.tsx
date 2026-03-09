import React from "react";

const BASE = import.meta.env.BASE_URL || "/";
const DEFAULT_AVATAR = BASE + "avatar.png";

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const avatar = localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR;

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={BASE + "token-inri.png"}
            alt="INRI"
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
            }}
          />

          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                color: isLight ? "#10131a" : "#ffffff",
              }}
            >
              {walletName}
            </div>

            <div
              style={{
                fontSize: 13,
                color: isLight ? "#5b6578" : "#97a0b3",
              }}
            >
              Secure wallet for INRI ecosystem
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(0,214,143,.35)",
              background: "rgba(0,214,143,.1)",
              color: "#00d68f",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Online • 3777
          </div>

          <img
            src={avatar}
            alt="Avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}`,
              background: isLight ? "#f8fafc" : "#0f172a",
            }}
          />
        </div>
      </div>
    </header>
  );
}
