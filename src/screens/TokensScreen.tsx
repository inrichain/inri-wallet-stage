import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const BASE = "/inri-wallet-stage/";
const RPC_URL = "https://rpc-chain.inri.life";
const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";

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
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
  },
  {
    symbol: "WINRI",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-winri.png",
    isDefault: true,
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
  },
  {
    symbol: "DNR",
    subtitle: "token",
    balance: "0.000000",
    logo: BASE + "token-dnr.png",
    isDefault: true,
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
  },
];

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
  const [customTokens, setCustomTokens] = useState<TokenItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [logo, setLogo] = useState("");
  const [message, setMessage] = useState("");
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
    return [...DEFAULT_TOKENS, ...customTokens];
  }, [customTokens]);

  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadBalances() {
      if (!address) return;

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const next: Record<string, string> = {};

        const nativeRaw = await provider.getBalance(address);
        next["INRI"] = Number(ethers.formatEther(nativeRaw)).toFixed(6);

        const abi = ["function balanceOf(address) view returns (uint256)"];

        for (const token of tokens) {
          if (token.symbol === "INRI") continue;
          if (!token.address) {
            next[token.symbol] = "0.000000";
            continue;
          }

          try {
            const contract = new ethers.Contract(token.address, abi, provider);
            const raw = await contract.balanceOf(address);
            next[token.symbol] = Number(
              ethers.formatUnits(raw, token.decimals || 18)
            ).toFixed(6);
          } catch {
            next[token.symbol] = "0.000000";
          }
        }

        if (!active) return;
        setBalances(next);
      } catch {}
    }

    loadBalances();
    const timer = setInterval(loadBalances, 12000);

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
          <div style={{ color: "#3f7cff", fontSize: 13, fontWeight: 700 }}>
            {message}
          </div>
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
              borderBottom: `1px solid ${isLight ? "rgba(20,30,60,.08)" : "rgba(255,255,255,.06)"}`,
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
                <div
                  style={{
                    fontWeight: 800,
                    color: isLight ? "#10131a" : "#ffffff",
                  }}
                >
                  {token.symbol}
                </div>
                <div
                  style={{
                    color: isLight ? "#5b6578" : "#97a0b3",
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
              <div
                style={{
                  fontWeight: 800,
                  color: isLight ? "#10131a" : "#ffffff",
                }}
              >
                {balances[token.symbol] ?? "0.000000"}
              </div>

              {token.isDefault ? (
                <div
                  style={{
                    background: isLight ? "#eef2f8" : "#1e2433",
                    color: isLight ? "#4a5568" : "#97a0b3",
                    padding: "6px 10px",
                    borderRadius: 8,
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
      remove: "Remove",
      fixed: "Fixed",
      symbolRequired: "Token symbol is required.",
      addressRequired: "Token address is required.",
      invalidAddress: "Invalid token address.",
      invalidDecimals: "Invalid decimals.",
      tokenExists: "Token already exists.",
      tokenAdded: "Token added.",
      tokenRemoved: "Token removed.",
    },
    pt: {
      tokens: "Tokens",
      tokenSymbol: "Símbolo do token",
      tokenAddress: "Endereço do token",
      logoOptional: "URL da logo (opcional)",
      addToken: "Adicionar Token",
      remove: "Remover",
      fixed: "Fixo",
      symbolRequired: "Símbolo obrigatório.",
      addressRequired: "Endereço do token obrigatório.",
      invalidAddress: "Endereço do token inválido.",
      invalidDecimals: "Decimais inválidos.",
      tokenExists: "Token já existe.",
      tokenAdded: "Token adicionado.",
      tokenRemoved: "Token removido.",
    },
    es: {
      tokens: "Tokens",
      tokenSymbol: "Símbolo del token",
      tokenAddress: "Dirección del token",
      logoOptional: "URL del logo (opcional)",
      addToken: "Agregar Token",
      remove: "Eliminar",
      fixed: "Fijo",
      symbolRequired: "Símbolo obligatorio.",
      addressRequired: "Dirección del token obligatoria.",
      invalidAddress: "Dirección del token inválida.",
      invalidDecimals: "Decimales inválidos.",
      tokenExists: "El token ya existe.",
      tokenAdded: "Token agregado.",
      tokenRemoved: "Token eliminado.",
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
    color: isLight ? "#10131a" : "#fff",
    outline: "none",
  };
}

function mainButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  };
}

function removeButtonStyle(): React.CSSProperties {
  return {
    background: "#ff4d4d",
    border: "none",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  };
}
