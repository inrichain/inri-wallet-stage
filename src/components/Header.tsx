import React from "react";
const BASE = "/inri-wallet-stage/";

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const avatar = localStorage.getItem("wallet_avatar") || `${BASE}token-inri.png`;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(14px)",
        background: isLight ? "rgba(255,255,255,.78)" : "rgba(10,14,20,.72)",
        borderBottom: `1px solid ${isLight ? "#dbe2f0" : "#1d2638"}`,
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={`${BASE}token-inri.png`} alt="INRI" style={{ width: 42, height: 42, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff" }}>{walletName || "INRI Wallet"}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? "#64748b" : "#94a3b8" }}>INRI Wallet • Mainnet ready</div>
          </div>
        </div>
        <img src={avatar} alt="avatar" style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover", border: `1px solid ${isLight ? "#dbe2f0" : "#253047"}`, background: isLight ? "#fff" : "#101827" }} />
      </div>
    </header>
  );
}
