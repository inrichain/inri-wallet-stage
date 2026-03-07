import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, TokenItem, loadAllBalances } from "../lib/inri";

const BASE = "/inri-wallet-stage/";
const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";

type ViewToken = TokenItem & {
  balance: string;
};

export default function TokensScreen({
  theme = "dark",
  lang = "en",
  address,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
}) {
  const isLight = theme === "light";
  const [customTokens, setCustomTokens] = useState<ViewToken[]>([]);
  const [symbol, setSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [logo, setLogo] = useState("");
  const [message, setMessage] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const t = getText(lang);

  useEffect(() => {
    const saved = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (saved) {
      try {
        setCustomTokens(JSON.parse(saved));
      } catch {
        setCustomTokens([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customTokens));
  }, [customTokens]);

  const tokens = useMemo(() => {
    return [
      ...DEFAULT_TOKENS.map((item) => ({ ...item, balance: "0.000000" })),
      ...customTokens,
    ];
  }, [customTokens]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const next = await loadAllBalances(address, tokens);
        if (!active) return;
        setBalances(next);
      } catch {
        if (!active) return;
        setBalances({});
      }
    }

    refresh();
    const timer = setInterval(refresh, 12000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address, tokens]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function addToken() {
    const cleanSymbol = symbol.trim().toUpperCase();
    const cleanAddress = tokenAddress.trim();
    const cleanLogo = logo.trim();
    const cleanDecimals = Number(decimals);

    if (!cleanSymbol) {
      showMessage(t.symbolRequired);
      return;
    }

    if (!cleanAddress) {
      showMessage(t.addressRequired);
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      showMessage(t.invalidAddress);
      return;
    }

    if (!Number.isFinite(cleanDecimals) || cleanDecimals < 0 || cleanDecimals > 36) {
      showMessage(t.invalidDecimals);
      return;
    }

    const exists = tokens.some(
      (token) =>
        token.symbol.toUpperCase() === cleanSymbol ||
        (token.address && token.address.toLowerCase() === cleanAddress.toLowerCase())
    );

    if (exists) {
      showMessage(t.tokenExists);
      return;
    }

    const newToken: ViewToken = {
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
    setTokenAddress("");
    setDecimals("18");
    setLogo("");
    showMessage(t.tokenAdded);
  }

  function removeToken(tokenSymbol: string) {
    setCustomTokens((prev) => prev.filter((t) => t.symbol !== tokenSymbol));
    showMessage(t.tokenRemoved);
  }

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
        {t.tokens}
      </h2>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <input
          placeholder={t.tokenSymbol}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={inputStyle(isLight)}
        />

        <input
          placeholder={t.tokenAddress}
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          style={inputStyle(isLight)}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px",
            gap: 8,
          }}
        >
          <input
            placeholder={t.logoOptional}
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            style={inputStyle(isLight)}
          />

          <input
            placeholder="18"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            style={inputStyle(isLight)}
          />
        </div>

        <button onClick={addToken} style={mainButtonStyle()}>
          {t.addToken}
        </button>

        {message ? (
          <div
            style={{
              color: "#3f7cff",
              fontWeight: 700,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {tokens.map((token) => (
          <div
            key={token.symbol + (token.address || "")}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 12,
              alignItems: "center",
              padding: "12px 0",
              borderBottom: `1px solid ${isLight ? "#edf1f7" : "#202635"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={token.logo}
                alt={token.symbol}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  objectFit: "cover",
                  background: isLight ? "#f4f7fc" : "#0d111b",
                }}
              />

              <div>
                <div
                  style={{
                    fontWeight: 900,
                    color: isLight ? "#10131a" : "#ffffff",
                    fontSize: 16,
                  }}
                >
                  {token.symbol}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: isLight ? "#5b6578" : "#97a0b3",
                  }}
                >
                  {token.subtitle}
                </div>
              </div>
            </div>

            <div
              style={{
                fontWeight: 900,
                color: isLight ? "#10131a" : "#ffffff",
                fontSize: 16,
              }}
            >
              {balances[token.symbol] || "0.000000"}
            </div>

            {token.isDefault ? (
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: isLight ? "#eef3fb" : "#1b2232",
                  color: isLight ? "#304260" : "#a9b3c8",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {t.fixed}
              </div>
            ) : (
              <button onClick={() => removeToken(token.symbol)} style={removeButtonStyle()}>
                {t.remove}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      tokens: "Tokens",
      tokenSymbol: "Token symbol",
      tokenAddress: "Token address",
      logoOptional: "Logo URL (optional)",
      addToken: "Add Token",
      symbolRequired: "Token symbol is required.",
      addressRequired: "Token address is required.",
      invalidAddress: "Invalid token address.",
      invalidDecimals: "Invalid decimals.",
      tokenExists: "Token already added.",
      tokenAdded: "Token added.",
      tokenRemoved: "Token removed.",
      fixed: "Fixed",
      remove: "Remove",
    },
    pt: {
      tokens: "Tokens",
      tokenSymbol: "Símbolo do token",
      tokenAddress: "Endereço do token",
      logoOptional: "URL da logo (opcional)",
      addToken: "Adicionar Token",
      symbolRequired: "O símbolo do token é obrigatório.",
      addressRequired: "O endereço do token é obrigatório.",
      invalidAddress: "Endereço de token inválido.",
      invalidDecimals: "Decimais inválidos.",
      tokenExists: "Token já adicionado.",
      tokenAdded: "Token adicionado.",
      tokenRemoved: "Token removido.",
      fixed: "Fixo",
      remove: "Remover",
    },
    es: {
      tokens: "Tokens",
      tokenSymbol: "Símbolo del token",
      tokenAddress: "Dirección del token",
      logoOptional: "URL del logo (opcional)",
      addToken: "Agregar Token",
      symbolRequired: "El símbolo del token es obligatorio.",
      addressRequired: "La dirección del token es obligatoria.",
      invalidAddress: "Dirección del token inválida.",
      invalidDecimals: "Decimales inválidos.",
      tokenExists: "El token ya fue agregado.",
      tokenAdded: "Token agregado.",
      tokenRemoved: "Token eliminado.",
      fixed: "Fijo",
      remove: "Eliminar",
    },
  };

  return map[lang] || map.en;
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#0d111b",
    color: isLight ? "#10131a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function mainButtonStyle(): React.CSSProperties {
  return {
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
}

function removeButtonStyle(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #c23b4b",
    background: "transparent",
    color: "#ff7585",
    cursor: "pointer",
    fontWeight: 700,
  };
}
