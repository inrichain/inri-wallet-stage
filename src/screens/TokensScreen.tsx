import React from "react";

const BASE = import.meta.env.BASE_URL;

const tokens = [
  {
    symbol: "INRI",
    subtitle: "native coin",
    balance: "0.000000",
    logo: BASE + "token-inri.png"
  },
  {
    symbol: "iUSD",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-iusd.png"
  },
  {
    symbol: "WINRI",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-winri.png"
  },
  {
    symbol: "DNR",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-dnr.png"
  }
];

export default function TokensScreen() {
  return (
    <div
      style={{
        border: "1px solid #252b39",
        borderRadius: 20,
        background: "#121621",
        padding: 16
      }}
    >
      <h2 style={{ marginTop: 0 }}>Tokens</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {tokens.map((token) => (
          <div
            key={token.symbol}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,.06)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={token.logo}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16
                }}
              />

              <div>
                <div style={{ fontWeight: 800 }}>{token.symbol}</div>
                <div style={{ color: "#97a0b3", fontSize: 12 }}>
                  {token.subtitle}
                </div>
              </div>
            </div>

            <div style={{ fontWeight: 800 }}>{token.balance}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
