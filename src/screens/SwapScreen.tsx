import React, { useMemo, useState } from "react";
import { DEFAULT_TOKENS } from "../lib/inri";

export default function SwapScreen({
  theme = "dark",
  lang = "en",
}: {
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const tokenOptions = DEFAULT_TOKENS.filter((x) => x.symbol === "INRI" || x.symbol === "iUSD");

  const [fromToken, setFromToken] = useState("INRI");
  const [toToken, setToToken] = useState("iUSD");
  const [amount, setAmount] = useState("");

  const estimated = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    return (n * 0.997).toFixed(6);
  }, [amount]);

  const from = tokenOptions.find((t) => t.symbol === fromToken) || tokenOptions[0];
  const to = tokenOptions.find((t) => t.symbol === toToken) || tokenOptions[1];

  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: isLight ? "#ffffff" : "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, color: isLight ? "#10131a" : "#ffffff" }}>
        {t.swap}
      </h2>

      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.from}</div>

        <div style={row}>
          <div style={tokenBox}>
            <img src={from.logo} alt={from.symbol} style={logoStyle} />
            <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{from.symbol}</strong>
          </div>

          <select
            value={fromToken}
            onChange={(e) => setFromToken(e.target.value)}
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

      <div
        style={{
          display: "grid",
          placeItems: "center",
          margin: "12px 0",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: isLight ? "#edf3ff" : "#1b2741",
            color: "#3f7cff",
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          ⇅
        </div>
      </div>

      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.to}</div>

        <div style={row}>
          <div style={tokenBox}>
            <img src={to.logo} alt={to.symbol} style={logoStyle} />
            <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{to.symbol}</strong>
          </div>

          <select
            value={toToken}
            onChange={(e) => setToToken(e.target.value)}
            style={selectStyle(isLight)}
          >
            {tokenOptions.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 18,
            fontWeight: 900,
            color: isLight ? "#10131a" : "#fff",
          }}
        >
          {estimated}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          textAlign: "center",
          color: isLight ? "#5b6578" : "#97a0b3",
          fontSize: 13,
        }}
      >
        {t.previewFee}
      </div>

      <button
        style={{
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
        }}
      >
        {t.swap}
      </button>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: { swap: "Swap", from: "From", to: "To", previewFee: "Preview only. Estimated 0.3% swap fee." },
    pt: { swap: "Swap", from: "De", to: "Para", previewFee: "Apenas visualização. Taxa estimada de swap: 0,3%." },
    es: { swap: "Swap", from: "De", to: "Para", previewFee: "Vista previa. Tarifa estimada de swap: 0,3%." },
    fr: { swap: "Swap", from: "De", to: "Vers", previewFee: "Aperçu uniquement. Frais estimés de 0,3%." },
    de: { swap: "Swap", from: "Von", to: "Zu", previewFee: "Nur Vorschau. Geschätzte Swap-Gebühr: 0,3%." },
    it: { swap: "Swap", from: "Da", to: "A", previewFee: "Solo anteprima. Commissione stimata: 0,3%." },
    ru: { swap: "Swap", from: "От", to: "К", previewFee: "Только предпросмотр. Комиссия swap: 0,3%." },
    zh: { swap: "兑换", from: "从", to: "到", previewFee: "仅预览。预计 0.3% 兑换费。" },
    ja: { swap: "スワップ", from: "元", to: "先", previewFee: "プレビューのみ。推定手数料 0.3%." },
    ko: { swap: "스왑", from: "보내는 토큰", to: "받는 토큰", previewFee: "미리보기 전용. 예상 수수료 0.3%." },
    tr: { swap: "Swap", from: "Kimden", to: "Kime", previewFee: "Sadece önizleme. Tahmini swap ücreti %0,3." },
  };
  return map[lang] || map.en;
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
  return {
    marginBottom: 10,
    fontSize: 13,
    color: isLight ? "#5b6578" : "#97a0b3",
  };
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
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
