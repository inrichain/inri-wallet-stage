import React, { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL;

type TokenItem = {
  symbol: string;
  subtitle: string;
  balance: string;
  logo: string;
};

const DEFAULT_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    subtitle: "native coin",
    balance: "0.000000",
    logo: BASE + "token-inri.png",
  },
  {
    symbol: "iUSD",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-iusd.png",
  },
  {
    symbol: "WINRI",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-winri.png",
  },
  {
    symbol: "DNR",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-dnr.png",
  },
];

export default function TokensScreen() {
  const [tokens, setTokens] = useState<TokenItem[]>(DEFAULT_TOKENS);
  const [symbol, setSymbol] = useState("");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("wallet_tokens");
    if (saved) {
      try {
        setTokens(JSON.parse(saved));
      } catch {
        setTokens(DEFAULT_TOKENS);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wallet_tokens", JSON.stringify(tokens));
  }, [tokens]);

  function addToken() {
    const cleanSymbol = symbol.trim().toUpperCase();
    const cleanLogo = logo.trim();

    if (!cleanSymbol) return;

    const exists = tokens.some((t) => t.symbol === cleanSymbol);
    if (exists) {
      setSymbol("");
      setLogo("");
      return;
    }

    const newToken: TokenItem = {
      symbol: cleanSymbol,
      subtitle: "custom token",
      balance: "0.000000",
      logo: cleanLogo || BASE + "token-inri.png",
    };

    setTokens([...tokens, newToken]);
    setSymbol("");
    setLogo("");
  }

  function removeToken(tokenSymbol: string) {
    const filtered = tokens.filter((t) => t.symbol !== tokenSymbol);
    setTokens(filtered);
  }

  return (
    <div
      style={{
        border: "1px solid #252b39",
        borderRadius: 20,
        background: "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Tokens</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Token symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #252b39",
            background: "#0d111b",
            color: "#fff",
          }}
        />

        <input
          placeholder="Logo URL (optional)"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #252b39",
            background: "#0d111b",
            color: "#fff",
          }}
        />

        <button
          onClick={addToken}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "#3f7cff",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Add
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {tokens.map((token) => (
          <div
            key={token.symbol}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,.06)",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={token.logo}
                alt={token.symbol}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  objectFit: "cover",
                  background: "#0d111b",
                }}
              />

              <div>
                <div style={{ fontWeight: 800 }}>{token.symbol}</div>
                <div style={{ color: "#97a0b3", fontSize: 12 }}>
                  {token.subtitle}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>{token.balance}</div>

              <button
                onClick={() => removeToken(token.symbol)}
                style={{
                  background: "#ff4d4d",
                  border: "none",
                  color: "#fff",
                  padding: "6px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
