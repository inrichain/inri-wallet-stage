import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, loadAllBalances } from "../lib/inri";

export default function SwapScreen({
  theme = "dark",
  lang = "en",
  address,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const tokenOptions = DEFAULT_TOKENS.filter(
    (x) => x.symbol === "INRI" || x.symbol === "iUSD" || x.symbol === "WINRI" || x.symbol === "DNR"
  );

  const [fromToken, setFromToken] = useState("INRI");
  const [toToken, setToToken] = useState("iUSD");
  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      const next = await loadAllBalances(address, tokenOptions);
      if (!active) return;
      setBalances(next);
    }

    load();
    const timer = setInterval(load, 8000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address]);

  function reverseTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
  }

  const estimated = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    return (n * 0.997).toFixed(6);
  }, [amount]);

  const from = tokenOptions.find((t) => t.symbol === fromToken) || tokenOptions[0];
  const to = tokenOptions.find((t) => t.symbol === toToken) || tokenOptions[1];

  return (
    <div style={wrap(isLight)}>
      <h2 style={title(isLight)}>{t.swap}</h2>

      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.from}</div>
        <div style={row}>
          <div style={tokenBox}>
            <img src={from.logo} alt={from.symbol} style={logoStyle} />
            <div>
              <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{from.symbol}</strong>
              <div style={hint(isLight)}>
                {t.balance}: {balances[from.symbol] || "0.000000"}
              </div>
            </div>
          </div>

          <select
            value={fromToken}
            onChange={(e) => {
              const next = e.target.value;
              if (next === toToken) {
                setToToken(fromToken);
              }
              setFromToken(next);
            }}
            style={selectStyle(isLight)}
          >
            {tokenOptions.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
        </div>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={inputStyle(isLight)}
        />
      </div>

      <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}>
        <button onClick={reverseTokens} style={swapButtonStyle(isLight)} title={t.reverse}>
          ⇅
        </button>
      </div>

      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.to}</div>
        <div style={row}>
          <div style={tokenBox}>
            <img src={to.logo} alt={to.symbol} style={logoStyle} />
            <div>
              <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{to.symbol}</strong>
              <div style={hint(isLight)}>
                {t.balance}: {balances[to.symbol] || "0.000000"}
              </div>
            </div>
          </div>

          <select
            value={toToken}
            onChange={(e) => {
              const next = e.target.value;
              if (next === fromToken) {
                setFromToken(toToken);
              }
              setToToken(next);
            }}
            style={selectStyle(isLight)}
          >
            {tokenOptions.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
        </div>

        <div style={estimatedStyle(isLight)}>{estimated}</div>
      </div>

      <div style={foot(isLight)}>{t.previewFee}</div>

      <button style={mainButtonStyle()}>{t.swap}</button>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      swap: "Swap",
      from: "From",
      to: "To",
      balance: "Balance",
      reverse: "Reverse tokens",
      previewFee: "Preview only. Real swap needs router/liquidity integration.",
    },
    pt: {
      swap: "Swap",
      from: "De",
      to: "Para",
      balance: "Saldo",
      reverse: "Inverter tokens",
      previewFee: "Somente prévia. O swap real precisa de roteador/liquidez.",
    },
  };
  return map[lang] || map.en;
}

function wrap(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}
function title(isLight: boolean): React.CSSProperties {
  return { marginTop: 0, color: isLight ? "#10131a" : "#ffffff" };
}
function panel(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#fbfcff" : "#0f1522",
    padding: 14,
  };
}
function label(isLight: boolean): React.CSSProperties {
  return { marginBottom: 10, fontSize: 13, color: isLight ? "#5b6578" : "#97a0b3" };
}
function hint(isLight: boolean): React.CSSProperties {
  return { fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" };
}
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};
const tokenBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};
const logoStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 17,
  objectFit: "cover",
};
function selectStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#12192a",
    color: isLight ? "#10131a" : "#ffffff",
    outline: "none",
  };
}
function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#0d111b",
    color: isLight ? "#10131a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}
function estimatedStyle(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 900,
    color: isLight ? "#10131a" : "#fff",
  };
}
function foot(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 14,
    textAlign: "center",
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
  };
}
function mainButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 14,
    padding: "14px 16px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16,
  };
}
function swapButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    display: "grid",
    placeItems: "center",
    background: isLight ? "#edf3ff" : "#1b2741",
    color: "#3f7cff",
    fontSize: 22,
    fontWeight: 900,
    cursor: "pointer",
  };
}
