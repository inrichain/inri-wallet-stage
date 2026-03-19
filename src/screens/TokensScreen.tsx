import React, { useEffect, useMemo, useState } from "react";
import {
  TokenItem,
  getDefaultTokensForNetwork,
  loadAllBalances,
  resolveTokenMetadata,
} from "../lib/inri";
import { getStoredNetwork } from "../lib/network";

const BASE = import.meta.env.BASE_URL || "/";
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
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [customTokens, setCustomTokens] = useState<ViewToken[]>([]);
  const [symbol, setSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [logo, setLogo] = useState("");
  const [message, setMessage] = useState("");
  const [editingTokenSymbol, setEditingTokenSymbol] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [detectingToken, setDetectingToken] = useState(false);
  const t = getText(lang);

  useEffect(() => {
    const syncNetwork = () => setNetworkKey(getStoredNetwork().key);
    const saved = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (saved) {
      try {
        setCustomTokens(JSON.parse(saved));
      } catch {
        setCustomTokens([]);
      }
    }
    window.addEventListener("storage", syncNetwork);
    window.addEventListener("wallet-network-updated", syncNetwork as EventListener);
    return () => {
      window.removeEventListener("storage", syncNetwork);
      window.removeEventListener("wallet-network-updated", syncNetwork as EventListener);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customTokens));
  }, [customTokens]);

  const tokens = useMemo(() => {
    return [
      ...getDefaultTokensForNetwork(networkKey).map((item) => ({ ...item, balance: "0.000000" })),
      ...customTokens.filter((item) => !item.networkKey || item.networkKey === networkKey),
    ];
  }, [customTokens, networkKey]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const next = await loadAllBalances(address, tokens, networkKey);
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
  }, [address, tokens, networkKey]);

  useEffect(() => {
    const cleanAddress = tokenAddress.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setDetectingToken(false);
      return;
    }

    const exists = tokens.some(
      (token) => token.address && token.address.toLowerCase() === cleanAddress.toLowerCase()
    );

    if (exists) {
      setDetectingToken(false);
      return;
    }

    let active = true;
    setDetectingToken(true);

    const timer = window.setTimeout(async () => {
      try {
        const meta = await resolveTokenMetadata(cleanAddress, networkKey);
        if (!active) return;
        setSymbol(meta.symbol || "");
        setDecimals(String(meta.decimals ?? 18));
        setLogo((prev) => prev.trim() || meta.logo);
        showMessage(t.tokenDetected.replace("{symbol}", meta.symbol));
      } catch {
      } finally {
        if (active) setDetectingToken(false);
      }
    }, 550);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tokenAddress, networkKey]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function handleUploadTokenLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
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

    const exists = tokens.some((token) => {
      if (!editingTokenSymbol) {
        return token.symbol.toUpperCase() === cleanSymbol || (token.address && token.address.toLowerCase() === cleanAddress.toLowerCase());
      }
      if (token.symbol === editingTokenSymbol) return false;
      return token.symbol.toUpperCase() === cleanSymbol || (token.address && token.address.toLowerCase() === cleanAddress.toLowerCase());
    });

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
      networkKey,
    };

    setCustomTokens((prev) => editingTokenSymbol ? prev.map((item) => item.symbol === editingTokenSymbol ? newToken : item) : [...prev, newToken]);
    setSymbol("");
    setTokenAddress("");
    setDecimals("18");
    setLogo("");
    setEditingTokenSymbol("");
    showMessage(editingTokenSymbol ? t.tokenUpdated : t.tokenAdded);
  }

  function editToken(token: ViewToken) {
    setEditingTokenSymbol(token.symbol);
    setSymbol(token.symbol);
    setTokenAddress(token.address || "");
    setDecimals(String(token.decimals ?? 18));
    setLogo(token.logo || "");
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
          placeholder={t.tokenAddress}
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          style={inputStyle(isLight)}
        />

        <input
          placeholder={t.tokenSymbol}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
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

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={secondaryButtonStyle(isLight)}>
            {t.uploadLogo}
            <input type="file" accept="image/*" onChange={handleUploadTokenLogo} style={{ display: "none" }} />
          </label>
          {logo ? <img src={logo} alt="token logo" style={{ width: 38, height: 38, borderRadius: 19, objectFit: "cover", border: `1px solid ${isLight ? "#dbe2f0" : "#2c3950"}` }} /> : null}
        </div>

        {detectingToken ? (
          <div style={{ color: isLight ? "#304260" : "#a9b3c8", fontSize: 13, fontWeight: 700 }}>
            {t.searchingToken}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={addToken} style={mainButtonStyle()}>
            {editingTokenSymbol ? t.saveToken : t.addToken}
          </button>
          {editingTokenSymbol ? <button onClick={() => { setEditingTokenSymbol(""); setSymbol(""); setTokenAddress(""); setDecimals("18"); setLogo(""); }} style={ghostButtonStyle(isLight)}>{t.cancel}</button> : null}
        </div>

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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => editToken(token)} style={miniButtonStyle(isLight)}>
                  {t.edit}
                </button>
                <button onClick={() => removeToken(token.symbol)} style={removeButtonStyle()}>
                  {t.remove}
                </button>
              </div>
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
      tokens: "Tokens", tokenSymbol: "Token symbol", tokenAddress: "Token address", logoOptional: "Logo URL (optional)", uploadLogo: "Upload logo", addToken: "Add Token", saveToken: "Save token", cancel: "Cancel", edit: "Edit", symbolRequired: "Token symbol is required.", addressRequired: "Token address is required.", invalidAddress: "Invalid token address.", invalidDecimals: "Invalid decimals.", tokenExists: "Token already added.", tokenAdded: "Token added.", tokenUpdated: "Token updated.", tokenRemoved: "Token removed.", tokenDetected: "Token detected: {symbol}", searchingToken: "Searching token data automatically...", fixed: "Fixed", remove: "Remove",
    },
    pt: {
      tokens: "Tokens", tokenSymbol: "Símbolo do token", tokenAddress: "Endereço do token", logoOptional: "URL da logo (opcional)", uploadLogo: "Enviar logo", addToken: "Adicionar Token", saveToken: "Salvar token", cancel: "Cancelar", edit: "Editar", symbolRequired: "O símbolo do token é obrigatório.", addressRequired: "O endereço do token é obrigatório.", invalidAddress: "Endereço de token inválido.", invalidDecimals: "Decimais inválidos.", tokenExists: "Token já adicionado.", tokenAdded: "Token adicionado.", tokenUpdated: "Token atualizado.", tokenRemoved: "Token removido.", tokenDetected: "Token detectado: {symbol}", searchingToken: "Buscando dados do token automaticamente...", fixed: "Fixo", remove: "Remover",
    },
    es: {
      tokens: "Tokens", tokenSymbol: "Símbolo del token", tokenAddress: "Dirección del token", logoOptional: "URL del logo (opcional)", uploadLogo: "Subir logo", addToken: "Agregar Token", saveToken: "Guardar token", cancel: "Cancelar", edit: "Editar", symbolRequired: "El símbolo del token es obligatorio.", addressRequired: "La dirección del token es obligatoria.", invalidAddress: "Dirección del token inválida.", invalidDecimals: "Decimales inválidos.", tokenExists: "El token ya fue agregado.", tokenAdded: "Token agregado.", tokenUpdated: "Token actualizado.", tokenRemoved: "Token eliminado.", tokenDetected: "Token detectado: {symbol}", searchingToken: "Buscando datos del token automáticamente...", fixed: "Fijo", remove: "Eliminar",
    },
  };

  map.fr ||= map.en;
  map.de ||= map.en;
  map.it ||= map.en;
  map.ru ||= map.en;
  map.zh ||= map.en;
  map.ja ||= map.en;
  map.ko ||= map.en;
  map.tr ||= map.en;
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


function miniButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${isLight ? "#dbe2f0" : "#2c3950"}`,
    background: isLight ? "#f4f7fc" : "#182132",
    color: isLight ? "#10131a" : "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function ghostButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    height: 46,
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#2c3950"}`,
    background: "transparent",
    color: isLight ? "#10131a" : "#fff",
    fontWeight: 800,
    padding: "0 16px",
    cursor: "pointer",
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#2c3950"}`,
    background: "transparent",
    color: isLight ? "#10131a" : "#fff",
    fontWeight: 800,
    padding: "0 14px",
    cursor: "pointer",
  };
}
