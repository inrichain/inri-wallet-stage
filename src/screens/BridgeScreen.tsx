import React, { useMemo, useState } from "react";

const BASE = "/inri-wallet-stage/";

const TOKENS = [
  { symbol: "iUSD", logo: BASE + "token-iusd.png" },
  { symbol: "INRI", logo: BASE + "token-inri.png" },
  { symbol: "WINRI", logo: BASE + "token-winri.png" },
  { symbol: "DNR", logo: BASE + "token-dnr.png" },
];

export default function BridgeScreen() {
  const [fromNetwork, setFromNetwork] = useState("Polygon");
  const [toNetwork, setToNetwork] = useState("INRI CHAIN");
  const [token, setToken] = useState("iUSD");
  const [amount, setAmount] = useState("");

  const tokenObj = TOKENS.find((t) => t.symbol === token);

  const preview = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    const fee = n * 0.002;
    return (n - fee).toFixed(6);
  }, [amount]);

  function switchNetworks() {
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
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
      <h2 style={{ marginTop: 0 }}>Bridge</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={boxStyle}>
          <div style={labelStyle}>From network</div>
          <select value={fromNetwork} onChange={(e) => setFromNetwork(e.target.value)} style={fullSelectStyle}>
            <option>Polygon</option>
            <option>INRI CHAIN</option>
            <option>BSC</option>
            <option>Ethereum</option>
            <option>Arbitrum</option>
          </select>
        </div>

        <button onClick={switchNetworks} style={switchButtonStyle}>
          ⇅
        </button>

        <div style={boxStyle}>
          <div style={labelStyle}>To network</div>
          <select value={toNetwork} onChange={(e) => setToNetwork(e.target.value)} style={fullSelectStyle}>
            <option>INRI CHAIN</option>
            <option>Polygon</option>
            <option>BSC</option>
            <option>Ethereum</option>
            <option>Arbitrum</option>
          </select>
        </div>

        <div style={boxStyle}>
          <div style={labelStyle}>Token</div>
          <div style={tokenRowStyle}>
            <div style={tokenLeftStyle}>
              <img src={tokenObj?.logo} alt={token} style={tokenLogoStyle} />
              <div style={{ fontWeight: 800 }}>{token}</div>
            </div>

            <select value={token} onChange={(e) => setToken(e.target.value)} style={selectStyle}>
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={inputStyle}
        />

        <div style={previewBoxStyle}>
          <div style={{ color: "#97a0b3", fontSize: 13 }}>Estimated receive</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>
            {preview} {token}
          </div>
          <div style={{ color: "#97a0b3", fontSize: 12, marginTop: 8 }}>
            Bridge fee preview: 0.2%
          </div>
        </div>

        <button style={mainButtonStyle}>Bridge</button>
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

const fullSelectStyle: React.CSSProperties = {
  width: "100%",
  background: "#121621",
  color: "#fff",
  border: "1px solid #252b39",
  borderRadius: 10,
  padding: "10px 12px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#0d111b",
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

const previewBoxStyle: React.CSSProperties = {
  border: "1px solid #252b39",
  borderRadius: 16,
  background: "#0d111b",
  padding: 14,
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
