import React, { useMemo, useState } from "react";
import { DEFAULT_TOKENS } from "../lib/inri";

export default function BridgeScreen({
  theme = "dark",
  lang = "en",
}: {
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const tokenOptions = DEFAULT_TOKENS.filter((x) => x.symbol === "iUSD");
  const [fromNetwork, setFromNetwork] = useState("Polygon");
  const [toNetwork, setToNetwork] = useState("INRI CHAIN");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("iUSD");

  const estimated = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    return (n * 0.998).toFixed(6);
  }, [amount]);

  const currentToken = tokenOptions.find((x) => x.symbol === token) || tokenOptions[0];

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
        {t.bridge}
      </h2>

      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.fromNetwork}</div>
        <select value={fromNetwork} onChange={(e) => setFromNetwork(e.target.value)} style={selectStyle(isLight)}>
          <option value="Polygon">Polygon</option>
          <option value="INRI CHAIN">INRI CHAIN</option>
        </select>
      </div>

      <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}>
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
        <div style={label(isLight)}>{t.toNetwork}</div>
        <select value={toNetwork} onChange={(e) => setToNetwork(e.target.value)} style={selectStyle(isLight)}>
          <option value="INRI CHAIN">INRI CHAIN</option>
          <option value="Polygon">Polygon</option>
        </select>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.token}</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={currentToken.logo} alt={currentToken.symbol} style={{ width: 34, height: 34, borderRadius: 17 }} />
            <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{currentToken.symbol}</strong>
          </div>

          <select value={token} onChange={(e) => setToken(e.target.value)} style={selectStyle(isLight)}>
            {tokenOptions.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        style={inputStyle(isLight)}
      />

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.estimatedReceive}</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#fff" }}>
          {estimated} {token}
        </div>
        <div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>
          {t.previewFee}
        </div>
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
        {t.bridge}
      </button>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      bridge: "Bridge",
      fromNetwork: "From network",
      toNetwork: "To network",
      token: "Token",
      estimatedReceive: "Estimated receive",
      previewFee: "Bridge fee preview: 0.2%",
    },
    pt: {
      bridge: "Bridge",
      fromNetwork: "Da rede",
      toNetwork: "Para a rede",
      token: "Token",
      estimatedReceive: "Recebimento estimado",
      previewFee: "Prévia da taxa de bridge: 0,2%",
    },
    es: {
      bridge: "Bridge",
      fromNetwork: "Desde la red",
      toNetwork: "Hacia la red",
      token: "Token",
      estimatedReceive: "Recepción estimada",
      previewFee: "Vista previa de comisión bridge: 0,2%",
    },
    fr: {
      bridge: "Bridge",
      fromNetwork: "Depuis le réseau",
      toNetwork: "Vers le réseau",
      token: "Token",
      estimatedReceive: "Réception estimée",
      previewFee: "Aperçu des frais bridge : 0,2%",
    },
    de: {
      bridge: "Bridge",
      fromNetwork: "Vom Netzwerk",
      toNetwork: "Zum Netzwerk",
      token: "Token",
      estimatedReceive: "Geschätzter Erhalt",
      previewFee: "Bridge-Gebühr Vorschau: 0,2%",
    },
    it: {
      bridge: "Bridge",
      fromNetwork: "Dalla rete",
      toNetwork: "Alla rete",
      token: "Token",
      estimatedReceive: "Ricezione stimata",
      previewFee: "Anteprima commissione bridge: 0,2%",
    },
    ru: {
      bridge: "Bridge",
      fromNetwork: "Из сети",
      toNetwork: "В сеть",
      token: "Токен",
      estimatedReceive: "Ожидаемое получение",
      previewFee: "Предпросмотр комиссии bridge: 0,2%",
    },
    zh: {
      bridge: "跨链",
      fromNetwork: "从网络",
      toNetwork: "到网络",
      token: "代币",
      estimatedReceive: "预计收到",
      previewFee: "跨链费用预览：0.2%",
    },
    ja: {
      bridge: "ブリッジ",
      fromNetwork: "元ネットワーク",
      toNetwork: "先ネットワーク",
      token: "トークン",
      estimatedReceive: "受取予想",
      previewFee: "ブリッジ手数料の目安: 0.2%",
    },
    ko: {
      bridge: "브리지",
      fromNetwork: "출발 네트워크",
      toNetwork: "도착 네트워크",
      token: "토큰",
      estimatedReceive: "예상 수령량",
      previewFee: "브리지 수수료 미리보기: 0.2%",
    },
    tr: {
      bridge: "Bridge",
      fromNetwork: "Ağdan",
      toNetwork: "Ağa",
      token: "Token",
      estimatedReceive: "Tahmini alınacak",
      previewFee: "Bridge ücret önizlemesi: %0,2",
    },
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

function selectStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
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
