import React, { useEffect, useMemo, useState } from "react";
import {
  TokenItem,
  getDefaultTokensForNetwork,
  loadAllBalances,
  resolveTokenMetadata,
} from "../lib/inri";
import { getStoredNetwork } from "../lib/network";
import { resolveTokenAsset } from "../lib/assets";
import LogoImage from "../components/LogoImage";

const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";

type ViewToken = TokenItem & {
  balance: string;
};

function readCustomTokens() {
  try {
    const saved = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (!saved) return [] as ViewToken[];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as ViewToken[]) : [];
  } catch {
    return [] as ViewToken[];
  }
}

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
  const [customTokens, setCustomTokens] = useState<ViewToken[]>(readCustomTokens());
  const [symbol, setSymbol] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [logo, setLogo] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [editingTokenKey, setEditingTokenKey] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [detectingToken, setDetectingToken] = useState(false);
  const t = getText(lang);

  useEffect(() => {
    const syncNetwork = () => setNetworkKey(getStoredNetwork().key);
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
    const merged = [
      ...getDefaultTokensForNetwork(networkKey).map((item) => ({ ...item, balance: "0.000000" })),
      ...customTokens.filter((item) => !item.networkKey || item.networkKey === networkKey),
    ].map((item) => ({
      ...item,
      logo: resolveTokenAsset({ symbol: item.symbol, name: item.subtitle, networkKey: item.networkKey, logo: item.logo }),
    }));

    const q = query.trim().toLowerCase();
    const withBalances = merged.map((item) => ({ ...item, balance: balances[item.symbol] || item.balance || "0.000000" }));
    const filtered = q
      ? withBalances.filter((item) => [item.symbol, item.subtitle, item.address || ""].join(" ").toLowerCase().includes(q))
      : withBalances;

    return filtered.sort((a, b) => {
      const aBalance = Number(a.balance || 0);
      const bBalance = Number(b.balance || 0);
      if (bBalance !== aBalance) return bBalance - aBalance;
      if (!!a.isDefault !== !!b.isDefault) return a.isDefault ? -1 : 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [customTokens, networkKey, query, balances]);

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
  }, [address, networkKey, customTokens]);

  useEffect(() => {
    const cleanAddress = tokenAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setDetectingToken(false);
      return;
    }

    const exists = [...getDefaultTokensForNetwork(networkKey), ...customTokens].some(
      (token) => token.address && token.address.toLowerCase() === cleanAddress.toLowerCase() && token.networkKey === networkKey
    );
    if (exists && !editingTokenKey) {
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
        setTokenName(meta.name || "");
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
  }, [tokenAddress, networkKey, editingTokenKey]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function resetForm() {
    setSymbol("");
    setTokenName("");
    setTokenAddress("");
    setDecimals("18");
    setLogo("");
    setEditingTokenKey("");
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
    const cleanName = tokenName.trim();
    const cleanAddress = tokenAddress.trim();
    const cleanLogo = logo.trim();
    const cleanDecimals = Number(decimals);
    const uniqueKey = `${networkKey}:${cleanAddress.toLowerCase() || cleanSymbol}`;

    if (!cleanSymbol) return showMessage(t.symbolRequired);
    if (!cleanAddress) return showMessage(t.addressRequired);
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) return showMessage(t.invalidAddress);
    if (!Number.isFinite(cleanDecimals) || cleanDecimals < 0 || cleanDecimals > 36) return showMessage(t.invalidDecimals);

    const exists = [...getDefaultTokensForNetwork(networkKey), ...customTokens].some((token) => {
      const key = `${token.networkKey || networkKey}:${(token.address || token.symbol).toLowerCase()}`;
      if (editingTokenKey && key === editingTokenKey) return false;
      return token.symbol.toUpperCase() === cleanSymbol || (token.address && token.address.toLowerCase() === cleanAddress.toLowerCase() && (token.networkKey || networkKey) === networkKey);
    });

    if (exists) return showMessage(t.tokenExists);

    const newToken: ViewToken = {
      symbol: cleanSymbol,
      subtitle: cleanName || `custom token • ${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}`,
      balance: balances[cleanSymbol] || "0.000000",
      logo: resolveTokenAsset({ symbol: cleanSymbol, name: cleanName, networkKey, logo: cleanLogo }),
      isDefault: false,
      address: cleanAddress,
      decimals: cleanDecimals,
      networkKey,
    };

    setCustomTokens((prev) => editingTokenKey
      ? prev.map((item) => (`${item.networkKey || networkKey}:${(item.address || item.symbol).toLowerCase()}` === editingTokenKey ? newToken : item))
      : [...prev, newToken]
    );

    resetForm();
    showMessage(editingTokenKey ? t.tokenUpdated : t.tokenAdded);
  }

  function editToken(token: ViewToken) {
    setEditingTokenKey(`${token.networkKey || networkKey}:${(token.address || token.symbol).toLowerCase()}`);
    setSymbol(token.symbol);
    setTokenName(token.subtitle?.startsWith("custom token") ? "" : token.subtitle || "");
    setTokenAddress(token.address || "");
    setDecimals(String(token.decimals ?? 18));
    setLogo(token.logo || "");
  }

  function removeToken(token: ViewToken) {
    const key = `${token.networkKey || networkKey}:${(token.address || token.symbol).toLowerCase()}`;
    setCustomTokens((prev) => prev.filter((item) => `${item.networkKey || networkKey}:${(item.address || item.symbol).toLowerCase()}` !== key));
    showMessage(t.tokenRemoved);
  }

  const totalTokens = tokens.length;
  const visibleWithBalance = tokens.filter((token) => Number(token.balance || 0) > 0).length;

  return (
    <div style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 24, background: isLight ? "#ffffff" : "#121621", padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>{t.tokens}</h2>
            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginTop: 6 }}>{getStoredNetwork().name} • {totalTokens} assets • {visibleWithBalance} with balance</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: `1px solid ${isLight ? "#dbe2f0" : "#2b3950"}`, background: isLight ? "#f8fbff" : "#0d1420" }}>
            <LogoImage src={getStoredNetwork().logo} alt={getStoredNetwork().name} kind="network" label={getStoredNetwork().name} symbol={getStoredNetwork().symbol} size={22} />
            <strong style={{ color: isLight ? "#10131a" : "#fff", fontSize: 13 }}>{getStoredNetwork().symbol}</strong>
          </div>
        </div>
        <input placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} style={inputStyle(isLight)} />
      </div>

      <div style={{ display: "grid", gap: 10, padding: 14, borderRadius: 18, background: isLight ? "#f8fbff" : "#0d1420", border: `1px solid ${isLight ? "#dde6f3" : "#223044"}` }}>
        <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>{editingTokenKey ? t.editToken : t.addToken}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input placeholder={t.tokenAddress} value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} style={inputStyle(isLight)} />
          <input placeholder={t.tokenSymbol} value={symbol} onChange={(e) => setSymbol(e.target.value)} style={inputStyle(isLight)} />
          <input placeholder={t.tokenName} value={tokenName} onChange={(e) => setTokenName(e.target.value)} style={inputStyle(isLight)} />
          <input placeholder="18" value={decimals} onChange={(e) => setDecimals(e.target.value)} style={inputStyle(isLight)} />
          <input placeholder={t.logoOptional} value={logo} onChange={(e) => setLogo(e.target.value)} style={inputStyle(isLight)} />
          <label style={{ ...inputStyle(isLight), display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <span>{t.uploadLogo}</span>
            <input type="file" accept="image/*" onChange={handleUploadTokenLogo} style={{ display: "none" }} />
            <span style={{ color: "#3f7cff", fontWeight: 800 }}>+</span>
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoImage src={logo || resolveTokenAsset({ symbol, name: tokenName, networkKey })} alt={symbol || "Token"} kind="token" label={tokenName || symbol || "Token"} symbol={symbol || "TOK"} size={34} rounded={false} />
            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>
              {detectingToken ? t.detecting : t.formHint}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {editingTokenKey ? <button onClick={resetForm} style={secondaryButton(isLight)}>{t.cancel}</button> : null}
            <button onClick={addToken} style={primaryButton}>{editingTokenKey ? t.saveChanges : t.add}</button>
          </div>
        </div>
        {message ? <div style={{ color: "#3f7cff", fontWeight: 700, fontSize: 13 }}>{message}</div> : null}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {tokens.length === 0 ? (
          <div style={{ padding: 18, borderRadius: 16, border: `1px dashed ${isLight ? "#d9e2f0" : "#2b3950"}`, color: isLight ? "#5b6578" : "#97a0b3" }}>{t.noTokens}</div>
        ) : tokens.map((token) => {
          const custom = !token.isDefault;
          return (
            <div key={`${token.symbol}-${token.address || token.networkKey || "native"}`} style={{ padding: 14, borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#ffffff" : "#111722", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <LogoImage src={token.logo} alt={token.symbol} kind="token" label={token.subtitle || token.symbol} symbol={token.symbol} size={42} rounded={false} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff" }}>{token.symbol}</div>
                      {custom ? <span style={pillStyle(theme, false)}>Custom</span> : <span style={pillStyle(theme, true)}>Default</span>}
                    </div>
                    <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{token.subtitle}</div>
                    {token.address ? <div style={{ color: isLight ? "#8a94a8" : "#7f8aa3", fontSize: 12 }}>{token.address}</div> : null}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff", fontSize: 18 }}>{token.balance}</div>
                  <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12 }}>{token.symbol}</div>
                </div>
              </div>
              {custom ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => editToken(token)} style={secondaryButton(isLight)}>{t.edit}</button>
                  <button onClick={() => removeToken(token)} style={dangerButton}>{t.remove}</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#d7e0ee" : "#2b3950"}`,
    background: isLight ? "#f8fbff" : "#0d1420",
    color: isLight ? "#10131a" : "#fff",
    outline: "none",
  };
}

const primaryButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "none",
  background: "#3f7cff",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

function secondaryButton(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#d7e0ee" : "#2b3950"}`,
    background: isLight ? "#fff" : "#101826",
    color: isLight ? "#10131a" : "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };
}

const dangerButton: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,123,123,.28)",
  background: "rgba(255,123,123,.08)",
  color: "#ff7b7b",
  fontWeight: 700,
  cursor: "pointer",
};

function pillStyle(theme: "dark" | "light", positive: boolean): React.CSSProperties {
  return {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: positive ? (theme === "light" ? "#eefaf1" : "rgba(74,222,128,.1)") : (theme === "light" ? "#eef4ff" : "rgba(63,124,255,.12)"),
    color: positive ? (theme === "light" ? "#1e7d4b" : "#6ee7a6") : "#6ea0ff",
  };
}

function getText(lang: string) {
  const pt = lang === "pt";
  return {
    tokens: pt ? "Tokens" : "Tokens",
    tokenAddress: pt ? "Endereço do token" : "Token address",
    tokenSymbol: pt ? "Símbolo" : "Symbol",
    tokenName: pt ? "Nome do token" : "Token name",
    logoOptional: pt ? "Logo URL opcional" : "Optional logo URL",
    uploadLogo: pt ? "Enviar logo" : "Upload logo",
    addToken: pt ? "Adicionar token personalizado" : "Add custom token",
    editToken: pt ? "Editar token personalizado" : "Edit custom token",
    add: pt ? "Adicionar" : "Add",
    edit: pt ? "Editar" : "Edit",
    remove: pt ? "Remover" : "Remove",
    cancel: pt ? "Cancelar" : "Cancel",
    saveChanges: pt ? "Salvar alterações" : "Save changes",
    noTokens: pt ? "Nenhum token encontrado para esta rede." : "No tokens found for this network.",
    searchPlaceholder: pt ? "Buscar por símbolo, nome ou endereço" : "Search by symbol, name or address",
    detecting: pt ? "Detectando metadados do token..." : "Detecting token metadata...",
    formHint: pt ? "Você pode usar upload de imagem ou URL para a logo." : "You can use image upload or logo URL.",
    tokenAdded: pt ? "Token adicionado." : "Token added.",
    tokenUpdated: pt ? "Token atualizado." : "Token updated.",
    tokenRemoved: pt ? "Token removido." : "Token removed.",
    tokenExists: pt ? "Esse token já existe nesta rede." : "That token already exists on this network.",
    symbolRequired: pt ? "Informe o símbolo." : "Enter the symbol.",
    addressRequired: pt ? "Informe o endereço do token." : "Enter the token address.",
    invalidAddress: pt ? "Endereço inválido." : "Invalid address.",
    invalidDecimals: pt ? "Decimals inválidos." : "Invalid decimals.",
    tokenDetected: pt ? "Token detectado: {symbol}" : "Token detected: {symbol}",
  };
}
