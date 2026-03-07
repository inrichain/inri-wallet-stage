import React from "react";

const BASE = "/inri-wallet-stage/";

type HeaderProps = {
  walletName?: string;
  theme?: "dark" | "light";
};

export default function Header({
  walletName = "INRI Wallet",
  theme = "dark",
}: HeaderProps) {
  const isLight = theme === "light";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(12px)",
        background: isLight ? "rgba(255,255,255,.82)" : "rgba(11,11,15,.82)",
        borderBottom: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={BASE + "token-inri.png"}
            alt="INRI"
            style={{
              width: 46,
              height: 46,
              objectFit: "contain",
              display: "block",
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
                fontSize: 12,
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
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(20,199,132,.45)",
              background: "rgba(20,199,132,.10)",
              color: "#08b26f",
              fontWeight: 800,
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            Online • 3777
          </div>
        </div>
      </div>
    </header>
  );
}
