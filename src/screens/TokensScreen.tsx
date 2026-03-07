import React, { useEffect, useMemo, useState } from "react";

const BASE = "/inri-wallet-stage/";

type TokenItem = {
  symbol: string;
  subtitle: string;
  balance: string;
  logo: string;
  isDefault: boolean;
  address?: string;
  decimals?: number;
};

const DEFAULT_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    subtitle: "native coin • pays gas",
    balance: "0.000000",
    logo: BASE + "token-inri.png",
    isDefault: true,
  },
  {
    symbol: "iUSD",
    subtitle: "stable token",
    balance: "0.000000",
    logo: BASE + "token-iusd.png",
    isDefault: true,
    address: "",
    decimals: 6,
  },
  {
    symbol: "WINRI",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-winri.png",
    isDefault: true,
    address: "",
    decimals: 18,
  },
  {
    symbol: "DNR",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-dnr.png",
    isDefault: true,
    address: "",
    decimals: 18,
  },
];

export default function TokensScreen() {
  const [customTokens, setCustomTokens] = useState<TokenItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [address, setAddress] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [logo, setLogo] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("wallet_custom_tokens");
    if (saved) {
      try {
        setCustomTokens(JSON.parse(saved));
      } catch {
        setCustomTokens([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wallet_custom_tokens", JSON.stringify(customTokens));
  }, [customTokens]);

  const tokens = useMemo(() => {
    return [...DEFAULT_TOKENS, ...customTokens];
  }, [customTokens]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function addToken() {
    const cleanSymbol = symbol.trim().toUpperCase();
    const cleanAddress = address.trim();
    const cleanLogo = logo.trim();
    const cleanDecimals = Number(decimals);

    if (!cleanSymbol) {
      showMessage("Token symbol is required.");
      return;
    }

    if (!cleanAddress) {
      showMessage("Token address is required.");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      showMessage("Invalid token address.");
      return;
    }

    if (!Number.isFinite(cleanDecimals) || cleanDecimals < 0 || cleanDecimals > 36) {
      showMessage("Invalid decimals.");
      return;
    }

    const exists = tokens.some(
      (t) =>
        t.symbol.toUpperCase() === cleanSymbol ||
        (t.address && t.address.toLowerCase() === cleanAddress.toLowerCase())
    );

    if (exists) {
      showMessage("Token already exists.");
      return;
    }

    const newToken: TokenItem = {
      symbol: cleanSymbol,
      subtitle: `custom token • ${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}`,
      balance: "0.000000",
      logo: cleanLogo || BASE + "token-inri.png",
      isDefault: false,
      address: cleanAddress,
      decimals: cleanDecimals,
    };

    setCustomTokens((prev) => [...prev, newToken]);
    setSymbol("");
    setAddress("");
    setDecimals("18");
    setLogo("");
    showMessage("Token added.");
  }

  function removeToken(tokenSymbol: string) {
    const target = customTokens.find((t) => t.symbol === tokenSymbol);
    if (!target) return;

    setCustomTokens((prev) => prev.filter((t) => t.symbol !== tokenSymbol));
    showMessage("Token removed.");
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
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Tokens</h2>

      <div
        style={{
          display: "grid",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Token symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Token address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={inputStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px",
            gap: 8,
          }}
        >
          <input
            placeholder="Logo URL (optional)"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Decimals"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button onClick={addToken} style={addButtonStyle}>
          Add Token
        </button>

        {message ? (
          <div style={{ color: "#8fb3ff", fontSize: 13 }}>{message}</div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {tokens.map((token) => (
          <div
            key={`${token.symbol}-${token.address || "default"}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,.06)",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <img
                src={token.logo}
                alt={token.symbol}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  objectFit: "cover",
                  background: "#0d111b",
                  flexShrink: 0,
                }}
              />

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{token.symbol}</div>
                <div
                  style={{
                    color: "#97a0b3",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 180,
                  }}
                >
                  {token.subtitle}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontWeight: 800 }}>{token.balance}</div>

              {token.isDefault ? (
                <div
                  style={{
                    background: "#1e2433",
                    color: "#97a0b3",
                    padding: "6px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Fixed
                </div>
              ) : (
                <button
                  onClick={() => removeToken(token.symbol)}
                  style={removeButtonStyle}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#0d111b",
  color: "#fff",
  outline: "none",
};

const addButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#3f7cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const removeButtonStyle: React.CSSProperties = {
  background: "#ff4d4d",
  border: "none",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};
