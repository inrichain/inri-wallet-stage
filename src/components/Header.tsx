import React from "react";

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const avatar = localStorage.getItem("wallet_avatar") || "/inri-wallet-stage/avatar.png";

  const isLight = theme === "light";

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: `1px solid ${isLight ? "#e4e8f0" : "#252b39"}`,
        background: isLight ? "#ffffff" : "#0f1420",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 20,
          color: isLight ? "#111" : "#fff",
        }}
      >
        {walletName}
      </div>

      <img
        src={avatar}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #3f7cff",
        }}
      />
    </header>
  );
}
