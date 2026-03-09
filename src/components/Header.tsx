import React from "react";
import { shortAddress } from "../lib/inri";
import { getActiveNetwork } from "../lib/networks";

const BASE = "/inri-wallet-stage/";

export default function Header({ address = "" }: { address?: string }) {
  const network = getActiveNetwork();

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "16px 16px 10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 18,
          borderRadius: 24,
          background:
            "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
          border: "1px solid rgba(79,116,201,.22)",
          boxShadow: "0 18px 40px rgba(0,0,0,.28)",
        }}
      >
        <img
          src={`${BASE}token-inri.png`}
          alt="INRI"
          style={{
            width: 56,
            height: 56,
            objectFit: "contain",
            flexShrink: 0,
            filter: "drop-shadow(0 12px 28px rgba(63,124,255,.28))",
          }}
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            Wallet 1
          </div>

          <div
            style={{
              color: "#9fb0cf",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {network.name} • Mainnet ready
          </div>
        </div>

        <div
          style={{
            color: "#7f93b9",
            fontSize: 12,
            fontWeight: 800,
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {address ? shortAddress(address) : ""}
        </div>
      </div>
    </div>
  );
}
