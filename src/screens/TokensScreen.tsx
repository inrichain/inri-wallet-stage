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
import ConfirmModal from "../components/ConfirmModal";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import { showAppToast } from "../lib/ui";

const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";
const HIDDEN_TOKENS_KEY = "wallet_hidden_default_tokens_v1";

type ViewToken = TokenItem & { balance: string };

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

function readHiddenTokens() {
  try {
    const saved = localStorage.getItem(HIDDEN_TOKENS_KEY);
    if (!saved) return [] as string[];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [] as string[];
  }
}

function tokenKey(token: Partial<TokenItem>, fallbackNetworkKey?: string) {
  const networkKey = token.networkKey || fallbackNetworkKey || getStoredNetwork().key;
  return `${networkKey}:${String(token.address || token.symbol || "").toLowerCase()}`;
}

export default function TokensScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [customTokens, setCustomTokens] = useState<ViewToken[]>(readCustomTokens());
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(readHiddenTokens());
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
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<ViewToken | null>(null);
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

  useEffect(() => { localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customTokens)); }, [customTokens]);
  useEffect(() => { localStorage.setItem(HIDDEN_TOKENS_KEY, JSON.stringify(hiddenTokens)); }, [hiddenTokens]);

  const tokens = useMemo(() => {
    const defaults = getDefaultTokensForNetwork(networkKey).filter((item) => !hiddenTokens.includes(tokenKey(item, networkKey))).map((item) => ({ ...item, balance: "0.000000" }));
    const overrides = customTokens.filter((item) => (item.networkKey || networkKey) === networkKey);
    const overrideKeys = new Set(overrides.map((item) => tokenKey(item, networkKey)));
    const merged = [...defaults.filter((item) => !overrideKeys.has(tokenKey(item, networkKey))), ...overrides].map((item) => ({
      ...item,
      logo: resolveTokenAsset({ symbol: item.symbol, name: item.subtitle, networkKey: item.networkKey, logo: item.logo }),
    }));

    const q = query.trim().toLowerCase();
    const withBalances = merged.map((item) => ({ ...item, balance: balances[item.symbol] || item.balance || "0.000000" }));
    const filtered = q ? withBalances.filter((item) => [item.symbol, item.subtitle, item.address || ""].join(" ").toLowerCase().includes(q)) : withBalances;

    return filtered.sort((a, b) => {
      const aBalance = Number(a.balance || 0);
      const bBalance = Number(b.balance || 0);
      if (bBalance !== aBalance) return bBalance - aBalance;
      if (!!a.isDefault !== !!b.isDefault) return a.isDefault ? -1 : 1;
      if (!!a.isNative !== !!b.isNative) return a.isNative ? -1 : 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [customTokens, networkKey, query, balances, hiddenTokens]);

  useEffect(() => {
    setLoadingBalances(true);
    let active = true;
    async function refresh() {
      try {
        const next = await loadAllBalances(address, tokens, networkKey);
        if (!active) return;
        setBalances(next);
      } catch {
        if (!active) return;
        setBalances({});
      } finally {
        if (active) setLoadingBalances(false);
      }
    }
    refresh();
    const timer = setInterval(refresh, 12000);
    return () => { active = false; clearInterval(timer); };
  }, [address, networkKey, customTokens, hiddenTokens]);

  useEffect(() => {
    const cleanAddress = tokenAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) { setDetectingToken(false); return; }
    const exists = [...getDefaultTokensForNetwork(networkKey), ...customTokens].some((token) => token.address && token.address.toLowerCase() === cleanAddress.toLowerCase() && (token.networkKey || networkKey) === networkKey);
    if (exists && !editingTokenKey) { setDetectingToken(false); return; }
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
    return () => { active = false; clearTimeout(timer); };
  }, [tokenAddress, networkKey, editingTokenKey]);

  function showMessage(text: string, type: "success" | "error" | "warning" | "info" = "info") {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
    showAppToast({ message: text, type });
  }

  function resetForm() {
    setSymbol(""); setTokenName(""); setTokenAddress(""); setDecimals("18"); setLogo(""); setEditingTokenKey("");
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
    const formKey = `${networkKey}:${(cleanAddress || cleanSymbol).toLowerCase()}`;

    if (!cleanSymbol) return showMessage(t.symbolRequired, "warning");
    if (!cleanAddress) return showMessage(t.addressRequired, "warning");
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) return showMessage(t.invalidAddress, "warning");
    if (!Number.isFinite(cleanDecimals) || cleanDecimals < 0 || cleanDecimals > 36) return showMessage(t.invalidDecimals, "warning");

    const defaults = getDefaultTokensForNetwork(networkKey);
    const nativeConflict = defaults.find((token) => token.isNative && (token.symbol.toUpperCase() === cleanSymbol || token.address?.toLowerCase() === cleanAddress.toLowerCase()));
    if (nativeConflict) return showMessage(t.nativeProtected, "warning");

    const exists = [...defaults, ...customTokens].some((token) => {
      const key = tokenKey(token, networkKey);
      if (editingTokenKey && key === editingTokenKey) return false;
      return key === formKey || (token.symbol.toUpperCase() === cleanSymbol && (token.networkKey || networkKey) === networkKey);
    });
    if (exists) return showMessage(t.tokenExists, "warning");

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

    setCustomTokens((prev) => {
      const defaultsForNetwork = getDefaultTokensForNetwork(networkKey);
      const editingDefault = editingTokenKey && defaultsForNetwork.some((item) => tokenKey(item, networkKey) === editingTokenKey);
      const withoutEditing = prev.filter((item) => tokenKey(item, networkKey) !== editingTokenKey);
      return editingDefault ? [...withoutEditing, { ...newToken, isDefault: true }] : editingTokenKey ? [...withoutEditing, newToken] : [...prev, newToken];
    });

    if (editingTokenKey) {
      const isDefaultEditing = getDefaultTokensForNetwork(networkKey).some((item) => tokenKey(item, networkKey) === editingTokenKey);
      if (isDefaultEditing) setHiddenTokens((prev) => Array.from(new Set([...prev, editingTokenKey])));
    }

    resetForm();
    showMessage(editingTokenKey ? t.tokenUpdated : t.tokenAdded, "success");
  }

  function editToken(token: ViewToken) {
    if (token.isNative) return showMessage(t.nativeProtected, "warning");
    setEditingTokenKey(tokenKey(token, networkKey));
    setSymbol(token.symbol);
    setTokenName(token.subtitle?.startsWith("custom token") ? "" : token.subtitle || "");
    setTokenAddress(token.address || "");
    setDecimals(String(token.decimals ?? 18));
    setLogo(token.logo || "");
  }

  function removeToken(token: ViewToken) {
    if (token.isNative) return showMessage(t.nativeProtected, "warning");
    const key = tokenKey(token, networkKey);
    const isDefaultToken = getDefaultTokensForNetwork(networkKey).some((item) => tokenKey(item, networkKey) === key);
    if (isDefaultToken) {
      setHiddenTokens((prev) => Array.from(new Set([...prev, key])));
      setCustomTokens((prev) => prev.filter((item) => tokenKey(item, networkKey) !== key));
    } else {
      setCustomTokens((prev) => prev.filter((item) => tokenKey(item, networkKey) !== key));
    }
    if (editingTokenKey === key) resetForm();
    showMessage(t.tokenRemoved, "success");
  }

  const totalTokens = tokens.length;
  const visibleWithBalance = tokens.filter((token) => Number(token.balance || 0) > 0).length;
  const inputClass = `wallet-ui-input ${isLight ? "light" : ""}`.trim();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ScreenCard theme={theme}>
        <SectionTitle
          theme={theme}
          title={t.tokens}
          subtitle={`${getStoredNetwork().name} • ${totalTokens} assets • ${visibleWithBalance} with balance`}
          actions={<div className="wallet-mini-stat" style={{ background: isLight ? "#f8fbff" : "#0d1420", borderColor: isLight ? "#dbe2f0" : "#2b3950" } as React.CSSProperties}><LogoImage src={getStoredNetwork().logo} alt={getStoredNetwork().name} kind="network" label={getStoredNetwork().name} symbol={getStoredNetwork().symbol} size={22} /><strong style={{ color: isLight ? "#10131a" : "#fff", fontSize: 13 }}>{getStoredNetwork().symbol}</strong></div>}
        />
        {loadingBalances ? <StatusPill theme={theme} tone="primary">Loading balances...</StatusPill> : null}
        <input placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} />
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={editingTokenKey ? t.editToken : t.addToken} compact subtitle={detectingToken ? t.detecting : t.formHint} />
        <div className="wallet-form-grid">
          <input placeholder={t.tokenAddress} value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} className={inputClass} />
          <input placeholder={t.tokenSymbol} value={symbol} onChange={(e) => setSymbol(e.target.value)} className={inputClass} />
          <input placeholder={t.tokenName} value={tokenName} onChange={(e) => setTokenName(e.target.value)} className={inputClass} />
          <input placeholder="18" value={decimals} onChange={(e) => setDecimals(e.target.value)} className={inputClass} />
          <input placeholder={t.logoOptional} value={logo} onChange={(e) => setLogo(e.target.value)} className={inputClass} />
          <ActionButton theme={theme} tone="secondary" asLabel>
            {t.uploadLogo}
            <input type="file" accept="image/*" onChange={handleUploadTokenLogo} style={{ display: "none" }} />
          </ActionButton>
        </div>
        <div className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <LogoImage src={logo || resolveTokenAsset({ symbol, name: tokenName, networkKey })} alt={symbol || "Token"} kind="token" label={tokenName || symbol || "Token"} symbol={symbol || "TOK"} size={34} rounded={false} />
            <div className="wallet-ui-subtle">{detectingToken ? t.detecting : t.formHint}</div>
          </div>
          <div className="wallet-action-row">
            {editingTokenKey ? <ActionButton theme={theme} tone="ghost" onClick={resetForm}>{t.cancel}</ActionButton> : null}
            <ActionButton theme={theme} tone="primary" onClick={addToken}>{editingTokenKey ? t.saveChanges : t.add}</ActionButton>
          </div>
        </div>
        {message ? <StatusPill theme={theme} tone="primary">{message}</StatusPill> : null}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={t.tokens} compact subtitle="Review default, custom and native assets for the current network." actions={<StatusPill theme={theme} tone="neutral">{tokens.length} listed</StatusPill>} />
        {loadingBalances && tokens.length > 0 ? (
          <div className="wallet-skeleton-list">{Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="wallet-skeleton-card" />)}</div>
        ) : tokens.length === 0 ? (
          <EmptyState theme={theme} title={t.noTokens} description="Add a custom asset or switch to another network to load a different default token list." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {tokens.map((token) => {
              const editable = !token.isNative;
              const isDefaultToken = getDefaultTokensForNetwork(networkKey).some((item) => tokenKey(item, networkKey) === tokenKey(token, networkKey));
              return (
                <div key={`${token.symbol}-${token.address || token.networkKey || "native"}`} className="wallet-list-row" style={{ background: isLight ? "#ffffff" : "#111722", borderColor: isLight ? "#dbe2f0" : "#252b39" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <LogoImage src={token.logo} alt={token.symbol} kind="token" label={token.subtitle || token.symbol} symbol={token.symbol} size={42} rounded={false} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff" }}>{token.symbol}</div>
                        {token.isNative ? <StatusPill theme={theme} tone="success">Native</StatusPill> : isDefaultToken ? <StatusPill theme={theme} tone="primary">Default</StatusPill> : <StatusPill theme={theme} tone="warning">Custom</StatusPill>}
                      </div>
                      <div className="wallet-ui-subtle">{token.subtitle}</div>
                      {token.address ? <div className="wallet-ui-subtle">{token.address}</div> : null}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff", fontSize: 18 }}>{token.balance}</div>
                      <div className="wallet-ui-subtle">{token.symbol}</div>
                    </div>
                    {editable ? <div className="wallet-action-row"><ActionButton theme={theme} tone="secondary" compact onClick={() => editToken(token)}>{t.edit}</ActionButton><ActionButton theme={theme} tone="danger" compact onClick={() => setConfirmRemove(token)}>{t.remove}</ActionButton></div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScreenCard>

      <ConfirmModal open={!!confirmRemove} theme={theme} title={confirmRemove ? `${t.remove} ${confirmRemove.symbol}?` : ""} description={confirmRemove ? `${confirmRemove.symbol} will be hidden or removed from ${getStoredNetwork().name}. Native tokens remain protected.` : ""} confirmLabel={t.remove} onConfirm={() => { if (confirmRemove) removeToken(confirmRemove); setConfirmRemove(null); }} onCancel={() => setConfirmRemove(null)} />
    </div>
  );
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
    editToken: pt ? "Editar token" : "Edit token",
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
    nativeProtected: pt ? "Token nativo da rede é protegido." : "Native network token is protected.",
  };
}
