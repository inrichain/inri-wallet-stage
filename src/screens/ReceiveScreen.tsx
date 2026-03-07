import React from "react";

const walletAddress = "0x119B51608D139342baB20bFF0654F275FFbbaAD0";

export default function ReceiveScreen() {
  return (
    <div
      style={{
        border: "1px solid #252b39",
        borderRadius: 20,
        background: "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Receive</h2>

      <div
        style={{
          width: 220,
          height: 220,
          margin: "0 auto",
          borderRadius: 20,
          background: "#ffffff",
          display: "grid",
          placeItems: "center",
          color: "#111",
          fontWeight: 800,
          fontSize: 28,
        }}
      >
        QR
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 14,
          background: "#0d111b",
          border: "1px solid #252b39",
          wordBreak: "break-all",
          color: "#97a0b3",
          fontSize: 13,
        }}
      >
        {walletAddress}
      </div>

      <button
        onClick={() => navigator.clipboard.writeText(walletAddress)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "#3f7cff",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Copy Address
      </button>
    </div>
  );
}
