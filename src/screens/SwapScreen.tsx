import React, { useMemo, useState } from "react";

const BASE = "/inri-wallet-stage/";

const TOKENS = [
  { symbol: "INRI", logo: BASE + "token-inri.png" },
  { symbol: "iUSD", logo: BASE + "token-iusd.png" },
  { symbol: "WINRI", logo: BASE + "token-winri.png" },
  { symbol: "DNR", logo: BASE + "token-dnr.png" },
];

export default function SwapScreen() {
  const [fromToken, setFromToken] = useState("INRI");
  const [toToken, setToToken] = useState("iUSD");
  const [amount, setAmount] = useState("");

  const preview = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    const fee = n * 0.003;
    return (n - fee).toFixed(6);
  }, [amount]);

  const fromObj = TOKENS.find((t) => t.symbol === fromToken);
  const toObj = TOKENS.find((t) => t.symbol === toToken);

  function switchTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
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
      <h2 style={{ marginTop: 0 }}>Swap</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={boxStyle}>
          <div style={labelStyle}>From</div>
          <div style={tokenRowStyle}>
            <div style={tokenLeftStyle}>
              <img src={fromObj?.logo} alt={fromToken} style={tokenLogoStyle} />
              <div style={{ fontWeight: 800 }}>{fromToken}</div>
            </div>

            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              style={selectStyle}
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>

        <button onClick={switchTokens} style={switchButtonStyle}>
          ⇅
        </button>

        <div style={boxStyle}>
          <div style={labelStyle}>To</div>
          <div style={tokenRowStyle}>
            <div style={tokenLeftStyle}>
              <img src={toObj?.logo} alt={toToken} style={tokenLogoStyle} />
              <div style={{ fontWeight: 800 }}>{toToken}</div>
            </div>

            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              style={selectStyle}
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            {preview}
          </div>
        </div>

        <div style={infoStyle}>
          Preview only. Estimated 0.3% swap fee.
        </div>

        <button style={mainButtonStyle}>Swap</button>
      </div>
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  border: "1px solid #252b39",
  borderRadius: 18,
  background: "#0d111b",
  padding: 14,
};

const labelStyle: React.CSSProperties = {
  color: "#97a0b3",
  fontSize: 13,
  marginBottom: 10,
};

const tokenRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const tokenLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const tokenLogoStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 17,
  objectFit: "cover",
};

const selectStyle: React.CSSProperties = {
  background: "#121621",
  color: "#fff",
  border: "1px solid #252b39",
  borderRadius: 10,
  padding: "8px 10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#121621",
  color: "#fff",
  outline: "none",
};

const switchButtonStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  margin: "0 auto",
  borderRadius: 26,
  border: "1px solid #252b39",
  background: "#1b2741",
  color: "#fff",
  cursor: "pointer",
  fontSize: 22,
  fontWeight: 800,
};

const infoStyle: React.CSSProperties = {
  color: "#97a0b3",
  fontSize: 13,
  textAlign: "center",
};

const mainButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "none",
  background: "#3f7cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 16,
};
