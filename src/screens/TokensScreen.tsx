import React, { useEffect, useMemo, useState } from "react";
import {
  CUSTOM_TOKENS_KEY,
  DEFAULT_TOKENS,
  TokenItem,
  dedupeTokens,
  discoverKnownTokens,
  formatTokenAmount,
  loadAllBalances,
  readTokenMetadata,
  storeCustomTokens,
  getStoredCustomTokens,
  shortAddress,
} from "../lib/inri";

const BASE = "/inri-wallet-stage/";

type ViewMode = "portfolio" | "manage";

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
  const t = getText(lang);

  const [view, setView] = useState<ViewMode>("portfolio");
  const [customTokens, setCustomTokens] = useState<TokenItem[]>([]);
  const [detectedTokens, setDetectedTokens] = useState<TokenItem[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [contractAddress, setContractAddress] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setCustomTokens(getStoredCustomTokens());
  }, []);

  useEffect(() => {
    storeCustomTokens(customTokens);
  }, [customTokens]);

  const allTokens = useMemo(
    () => dedupeTokens([...DEFAULT_TOKENS, ...detectedTokens, ...customTokens]),
    [customTokens, detectedTokens]
  );

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const next = await loadAllBalances(address, allTokens);
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
  }, [address, allTokens]);

  useEffect(() => {
    let active = true;

    async function initialDetect() {
      if (!address) return;
      try {
        const found = await discoverKnownTokens(address, customTokens);
        if (!active) return;
        setDetectedTokens(found);
      } catch {
        if (!active) return;
        setDetectedTokens([]);
      }
    }

    initialDetect();
    return () => {
      active = false;
    };
  }, [address]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  }

  async function addTokenByAddress() {
    const clean = contractAddress.trim();
    if (!clean) {
      flash(t.enterContract);
      return;
    }

    setAdding(true);
    try {
      const token = await readTokenMetadata(clean);
      const exists = allTokens.some(
        (item) => item.address?.toLowerCase() === token.address?.toLowerCase()
      );

      if (exists) {
        flash(t.tokenExists);
        return;
      }

      setCustomTokens((prev) => dedupeTokens([...prev, token]));
      setContractAddress("");
      flash(t.tokenAdded);
    } catch {
      flash(t.readFailed);
    } finally {
      setAdding(false);
    }
  }

  async function detectMoreTokens() {
    if (!address) {
      flash(t.connectWalletFirst);
      return;
    }

    setDetecting(true);
    try {
      const found = await discoverKnownTokens(address, customTokens);
      setDetectedTokens(found);
      flash(found.length ? t.detectDone : t.detectEmpty);
    } catch {
      flash(t.detectError);
    } finally {
      setDetecting(false);
    }
  }

  function removeToken(token: TokenItem) {
    setCustomTokens((prev) => prev.filter((item) => item.address !== token.address));
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customTokens));
    flash(t.tokenRemoved);
  }

  const totalVisible = allTokens.length;
  const withBalance = allTokens.filter((token) => Number(balances[token.symbol] || 0) > 0).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={heroCard(isLight)}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={eyebrow(isLight)}>{t.section}</div>
            <h2 style={heroTitle(isLight)}>{t.tokens}</h2>
            <div style={heroText(isLight)}>{t.subtitle}</div>
          </div>

          <div style={chipWrap}>
            <div style={chip(isLight)}>{totalVisible} {t.assets}</div>
            <div style={chip(isLight)}>{withBalance} {t.withBalance}</div>
          </div>
        </div>

        <div style={switchRow}>
          <button onClick={() => setView("portfolio")} style={switchButton(view === "portfolio", isLight)}>{t.portfolio}</button>
          <button onClick={() => setView("manage")} style={switchButton(view === "manage", isLight)}>{t.manage}</button>
          <button onClick={detectMoreTokens} style={ghostButton(isLight)} disabled={detecting}>
            {detecting ? t.detecting : t.autoDetect}
          </button>
        </div>

        {message ? <div style={messageStyle}>{message}</div> : null}
      </section>

      {view === "portfolio" ? (
        <section style={panel(isLight)}>
          <div style={sectionHeaderRow}>
            <div>
              <div style={sectionTitle(isLight)}>{t.portfolio}</div>
              <div style={sectionHint(isLight)}>{t.portfolioHint}</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {allTokens.map((token) => {
              const balance = balances[token.symbol] || "0.000000";
              const hasBalance = Number(balance) > 0;

              return (
                <div key={token.symbol + (token.address || "native")} style={tokenCard(isLight)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <img src={token.logo || BASE + "token-inri.png"} alt={token.symbol} style={tokenLogo} />
                    <div style={{ minWidth: 0 }}>
                      <div style={tokenSymbol(isLight)}>{token.symbol}</div>
                      <div style={tokenSubtitle(isLight)}>
                        {token.isNative ? t.nativeAsset : token.subtitle || token.name || t.customToken}
                      </div>
                      {!token.isNative && token.address ? (
                        <div style={tokenAddressStyle(isLight)}>{shortAddress(token.address)}</div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={balanceStyle(isLight)}>{formatTokenAmount(balance)}</div>
                    <div style={balanceSub(isLight)}>{hasBalance ? t.detected : t.zeroBalance}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section style={panel(isLight)}>
          <div style={sectionHeaderRow}>
            <div>
              <div style={sectionTitle(isLight)}>{t.manage}</div>
              <div style={sectionHint(isLight)}>{t.manageHint}</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            <input
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder={t.contractPlaceholder}
              style={inputStyle(isLight)}
            />
            <button onClick={addTokenByAddress} style={primaryButton} disabled={adding}>
              {adding ? t.reading : t.addToken}
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {[...detectedTokens, ...customTokens].length === 0 ? (
              <div style={emptyState(isLight)}>{t.noManagedTokens}</div>
            ) : (
              dedupeTokens([...detectedTokens, ...customTokens]).map((token) => (
                <div key={(token.address || token.symbol) + "manage"} style={manageRow(isLight)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <img src={token.logo || BASE + "token-inri.png"} alt={token.symbol} style={manageLogo} />
                    <div style={{ minWidth: 0 }}>
                      <div style={tokenSymbol(isLight)}>{token.symbol}</div>
                      <div style={tokenSubtitle(isLight)}>{token.address || token.subtitle}</div>
                    </div>
                  </div>

                  {customTokens.some((item) => item.address?.toLowerCase() === token.address?.toLowerCase()) ? (
                    <button onClick={() => removeToken(token)} style={removeButton(isLight)}>{t.remove}</button>
                  ) : (
                    <div style={detectedBadge(isLight)}>{t.auto}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      section: "Assets",
      tokens: "Tokens",
      subtitle: "Track native and ERC-20 assets with smart discovery.",
      assets: "assets",
      withBalance: "with balance",
      portfolio: "Portfolio",
      manage: "Manage",
      portfolioHint: "Your visible tokens and detected balances.",
      manageHint: "Add tokens by contract and manage detected assets.",
      autoDetect: "Auto-detect",
      detecting: "Detecting...",
      detectDone: "Token scan completed.",
      detectEmpty: "No extra tokens found in the current list.",
      detectError: "Could not scan tokens right now.",
      connectWalletFirst: "Unlock the wallet first.",
      addToken: "Add token by contract",
      reading: "Reading contract...",
      contractPlaceholder: "ERC-20 contract address",
      enterContract: "Enter a token contract address.",
      tokenExists: "This token is already in your wallet.",
      tokenAdded: "Token added successfully.",
      tokenRemoved: "Token removed.",
      readFailed: "Could not read token metadata.",
      nativeAsset: "native asset • pays gas",
      customToken: "custom token",
      zeroBalance: "No balance",
      detected: "Detected",
      remove: "Remove",
      auto: "Auto",
      noManagedTokens: "No custom or auto-detected tokens yet.",
    },
    pt: {
      section: "Ativos",
      tokens: "Tokens",
      subtitle: "Acompanhe INRI e tokens ERC-20 com detecção inteligente.",
      assets: "ativos",
      withBalance: "com saldo",
      portfolio: "Portfólio",
      manage: "Gerenciar",
      portfolioHint: "Seus tokens visíveis e saldos detectados.",
      manageHint: "Adicione tokens por contrato e gerencie ativos detectados.",
      autoDetect: "Auto detectar",
      detecting: "Detectando...",
      detectDone: "Leitura de tokens concluída.",
      detectEmpty: "Nenhum token extra encontrado na lista atual.",
      detectError: "Não foi possível escanear tokens agora.",
      connectWalletFirst: "Desbloqueie a carteira primeiro.",
      addToken: "Adicionar token por contrato",
      reading: "Lendo contrato...",
      contractPlaceholder: "Endereço do contrato ERC-20",
      enterContract: "Digite o endereço do contrato do token.",
      tokenExists: "Esse token já está na carteira.",
      tokenAdded: "Token adicionado com sucesso.",
      tokenRemoved: "Token removido.",
      readFailed: "Não foi possível ler os metadados do token.",
      nativeAsset: "ativo nativo • paga gas",
      customToken: "token personalizado",
      zeroBalance: "Sem saldo",
      detected: "Detectado",
      remove: "Remover",
      auto: "Auto",
      noManagedTokens: "Ainda não há tokens personalizados ou detectados.",
    },
  };
  return map[lang] || map.en;
}

function heroCard(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`,
    borderRadius: 26,
    background: isLight
      ? "linear-gradient(180deg,#ffffff 0%, #f8fbff 100%)"
      : "linear-gradient(180deg,#0f1829 0%, #101827 100%)",
    padding: 18,
    boxShadow: isLight ? "0 20px 44px rgba(24,36,64,.08)" : "0 24px 54px rgba(0,0,0,.28)",
  };
}
const chipWrap: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" };
function chip(isLight: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 999,
    border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`,
    background: isLight ? "#f7fbff" : "#0c1422",
    color: isLight ? "#47607c" : "#97a7c7",
    fontWeight: 700,
    fontSize: 13,
  };
}
function eyebrow(isLight: boolean): React.CSSProperties { return { color: isLight ? "#55718f" : "#8ba1c8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }; }
function heroTitle(isLight: boolean): React.CSSProperties { return { margin: 0, color: isLight ? "#0a1221" : "#fff", fontSize: 28, fontWeight: 700 }; }
function heroText(isLight: boolean): React.CSSProperties { return { marginTop: 8, color: isLight ? "#60718b" : "#92a5c9", fontSize: 14, maxWidth: 540, lineHeight: 1.5 }; }
const switchRow: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };
function switchButton(active: boolean, isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: active ? "1px solid rgba(79,124,255,.44)" : `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`,
    background: active ? (isLight ? "#ecf2ff" : "rgba(79,124,255,.18)") : (isLight ? "#fff" : "#0c1422"),
    color: active ? (isLight ? "#234fe2" : "#fff") : (isLight ? "#50627c" : "#92a5c9"),
    cursor: "pointer",
    fontWeight: 700,
  };
}
function ghostButton(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`,
    background: isLight ? "#fff" : "#0c1422",
    color: isLight ? "#0f1830" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}
const messageStyle: React.CSSProperties = { marginTop: 14, color: "#4f7cff", fontWeight: 700, fontSize: 13 };
function panel(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`,
    borderRadius: 24,
    background: isLight ? "#ffffff" : "#101827",
    padding: 16,
  };
}
const sectionHeaderRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" };
function sectionTitle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#0a1221" : "#fff", fontWeight: 700, fontSize: 18 }; }
function sectionHint(isLight: boolean): React.CSSProperties { return { color: isLight ? "#63728d" : "#8ea2c9", fontSize: 13, marginTop: 4 }; }
function tokenCard(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: 14, borderRadius: 20, border: `1px solid ${isLight ? "#e7edf8" : "#1d2942"}`, background: isLight ? "#fbfdff" : "#0d1524" }; }
const tokenLogo: React.CSSProperties = { width: 46, height: 46, borderRadius: 14, objectFit: "cover", background: "rgba(255,255,255,.04)" };
const manageLogo: React.CSSProperties = { width: 38, height: 38, borderRadius: 12, objectFit: "cover", background: "rgba(255,255,255,.04)" };
function tokenSymbol(isLight: boolean): React.CSSProperties { return { color: isLight ? "#0a1221" : "#fff", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }; }
function tokenSubtitle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#667792" : "#8ea2c9", fontSize: 12, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }; }
function tokenAddressStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#7b8ba4" : "#6f84ad", fontSize: 12, marginTop: 4 }; }
function balanceStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#0a1221" : "#fff", fontWeight: 700, fontSize: 16 }; }
function balanceSub(isLight: boolean): React.CSSProperties { return { color: isLight ? "#667792" : "#8ea2c9", fontSize: 12, marginTop: 4 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#f8fbff" : "#0c1422", color: isLight ? "#09111f" : "#fff", outline: "none" }; }
const primaryButton: React.CSSProperties = { width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: "linear-gradient(180deg,#26a6ff 0%, #4f7cff 100%)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 };
function emptyState(isLight: boolean): React.CSSProperties { return { padding: 18, borderRadius: 18, border: `1px dashed ${isLight ? "#d7e1f1" : "#2a3c5f"}`, color: isLight ? "#60718b" : "#92a5c9", textAlign: "center" }; }
function manageRow(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 18, border: `1px solid ${isLight ? "#e7edf8" : "#1d2942"}`, background: isLight ? "#fbfdff" : "#0d1524" }; }
function removeButton(isLight: boolean): React.CSSProperties { return { padding: "10px 12px", borderRadius: 12, border: `1px solid ${isLight ? "#f0c3cf" : "#5a2b39"}`, background: isLight ? "#fff5f7" : "rgba(255,107,138,.10)", color: "#ff6b8a", cursor: "pointer", fontWeight: 700 }; }
function detectedBadge(isLight: boolean): React.CSSProperties { return { padding: "10px 12px", borderRadius: 12, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#f7fbff" : "#0c1422", color: isLight ? "#49627c" : "#94a6c9", fontWeight: 700, fontSize: 12 }; }
