import React from "react";
import WalletShell from "./components/WalletShell";

export default function App() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999999,
          padding: "7px 12px",
          borderRadius: 999,
          border: "1px solid rgba(59,130,246,.45)",
          background: "rgba(15,23,42,.92)",
          color: "#93c5fd",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          boxShadow: "0 12px 34px rgba(0,0,0,.35)",
          pointerEvents: "none",
        }}
      >
        INRI Wallet V5 Secure Send ativo
      </div>
      <WalletShell />
    </>
  );
}
