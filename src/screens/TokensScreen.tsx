import React, { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_NETWORK_ID,
  getNetworkById,
} from "../lib/networks";
import {
  CUSTOM_TOKENS_KEY,
  TokenItem,
  dedupeTokens,
  discoverKnownTokens,
  formatTokenAmount,
  loadAllBalances,
  readTokenMetadata,
  storeCustomTokens,
  getStoredCustomTokens,
  shortAddress,
  getDefaultTokens,
} from "../lib/inri";

type ViewMode = "portfolio" | "manage";

export default function TokensScreen({
  theme = "dark",
  lang = "en",
  address,
  activeNetworkId = DEFAULT_NETWORK_ID,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
  activeNetworkId?: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);
  const network = getNetworkById(activeNetworkId);

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

  const networkDefaultTokens = useMemo(() => getDefaultTokens(network.id), [network.id]);
  const allTokens = useMemo(
    () =>
      dedupeTokens([...networkDefaultTokens, ...detectedTokens, ...customTokens]).filter(
        (token) => (token.networkId || network.id) === network.id
      ),
    [customTokens, detectedTokens, network.id, networkDefaultTokens]
  );

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const next = await loadAllBalances(address, allTokens, network.id);
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
  }, [address, allTokens, network.id]);

  useEffect(() => {
    let active = true;
    async function initialDetect() {
      if (!address) return;
      try {
        const found = await discoverKnownTokens(address, customTokens, network.id);
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
  }, [address, customTokens, network.id]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  }

  async function addToken() {
    if (!contractAddress.trim()) {
      flash(t.enterContract);
      return;
    }
    setAdding(true);
    try {
      const meta = await readTokenMetadata(contractAddress, network.id);
      const next = dedupeTokens([...customTokens, { ...meta, networkId: network.id }]);
      setCustomTokens(next);
      setContractAddress("");
      flash(t.tokenAdded);
    } catch {
      flash(t.invalidContract);
    } finally {
      setAdding(false);
    }
  }

  async function runDetect() {
    setDetecting(true);
    try {
      const found = await discoverKnownTokens(address, customTokens, network.id);
      setDetectedTokens(found);
      flash(t.detectionFinished);
    } catch {
      flash(t.detectionFailed);
    } finally {
      setDetecting(false);
    }
  }

  function removeToken(token: TokenItem) {
    const next = customTokens.filter(
      (item) => !((item.address || "").toLowerCase() === (token.address || "").toLowerCase() && (item.networkId || network.id) === network.id)
    );
    setCustomTokens(next);
    flash(t.tokenRemoved);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={heroCard(isLight)}>
        <div style={topRow}>
          <div>
            <div style={eyebrow(isLight)}>{t.portfolio}</div>
            <div style={heroTitle(isLight)}>{network.name}</div>
            <div style={heroText(isLight)}>{t.subtitle}</div>
          </div>
          <img src={network.icon} alt={network.name} style={{ width: 58, height: 58, objectFit: "contain" }} />
        </div>
      </section>

      <section style={toolbar(isLight)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => setView("portfolio")} style={tabStyle(view === "portfolio", isLight)}>{t.assets}</button>
          <button onClick={() => setView("manage")} style={tabStyle(view === "manage", isLight)}>{t.manage}</button>
        </div>
      </section>

      {view === "portfolio" ? (
        <section style={{ display: "grid", gap: 12 }}>
          {allTokens.map((token) => {
            const amount = balances[token.symbol] || "0.000000";
            return (
              <article key={`${network.id}-${token.address || token.symbol}`} style={cardStyle(isLight)}>
                <div style={topRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <img src={token.logo} alt={token.symbol} style={{ width: 46, height: 46, objectFit: "contain", borderRadius: 14, background: isLight ? "#f4f7fc" : "#101826", padding: 6 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: isLight ? "#0f172a" : "#fff", fontWeight: 900, fontSize: 16 }}>{token.symbol}</div>
                      <div style={{ color: isLight ? "#64748b" : "#9cb0cf", fontSize: 13 }}>{token.name || token.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: isLight ? "#0f172a" : "#fff", fontWeight: 900, fontSize: 18 }}>{formatTokenAmount(amount)}</div>
                    <div style={{ color: isLight ? "#64748b" : "#9cb0cf", fontSize: 12 }}>{token.symbol}</div>
                  </div>
                </div>
                {token.address ? <div style={{ marginTop: 10, color: isLight ? "#64748b" : "#90a3c7", fontSize: 12, fontWeight: 700 }}>{shortAddress(token.address)}</div> : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section style={{ display: "grid", gap: 14 }}>
          <div style={cardStyle(isLight)}>
            <div style={labelStyle(isLight)}>{t.detectTokens}</div>
            <div style={subLabelStyle(isLight)}>{t.detectTokensHelp}</div>
            <button onClick={runDetect} disabled={detecting} style={primaryButton}>{detecting ? t.detecting : t.detectNow}</button>
          </div>

          <div style={cardStyle(isLight)}>
            <div style={labelStyle(isLight)}>{t.addCustomToken}</div>
            <div style={subLabelStyle(isLight)}>{t.addCustomTokenHelp}</div>
            <input value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder={t.contractAddress} style={inputStyle(isLight)} />
            <div style={{ marginTop: 12 }}>
              <button onClick={addToken} disabled={adding} style={primaryButton}>{adding ? t.adding : t.addToken}</button>
            </div>
          </div>

          <div style={cardStyle(isLight)}>
            <div style={labelStyle(isLight)}>{t.customTokens}</div>
            <div style={subLabelStyle(isLight)}>{t.customTokensHelp}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {customTokens.filter((token) => (token.networkId || network.id) === network.id).length === 0 ? (
                <div style={{ color: isLight ? "#64748b" : "#90a3c7", fontSize: 13 }}>{t.noCustomTokens}</div>
              ) : (
                customTokens
                  .filter((token) => (token.networkId || network.id) === network.id)
                  .map((token) => (
                    <div key={`${network.id}-${token.address || token.symbol}`} style={miniCard(isLight)}>
                      <div>
                        <div style={{ color: isLight ? "#0f172a" : "#fff", fontWeight: 800 }}>{token.symbol}</div>
                        <div style={{ color: isLight ? "#64748b" : "#90a3c7", fontSize: 12 }}>{token.address ? shortAddress(token.address) : token.name}</div>
                      </div>
                      <button onClick={() => removeToken(token)} style={secondaryButton(isLight)}>{t.remove}</button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      )}

      {message ? <div style={{ color: "#3f7cff", fontWeight: 800, textAlign: "center" }}>{message}</div> : null}
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      portfolio: "Portfolio",
      subtitle: "Professional token view with logos, DNR and multi-network base.",
      assets: "Assets",
      manage: "Manage",
      detectTokens: "Detect tokens",
      detectTokensHelp: "Scan known tokens for the active network.",
      detectNow: "Detect now",
      detecting: "Detecting...",
      detectionFinished: "Detection finished.",
      detectionFailed: "Could not detect tokens.",
      addCustomToken: "Add custom token",
      addCustomTokenHelp: "Paste an ERC-20 contract from the active network.",
      contractAddress: "Contract address",
      addToken: "Add token",
      adding: "Adding...",
      enterContract: "Enter contract address.",
      invalidContract: "Invalid contract.",
      tokenAdded: "Token added.",
      tokenRemoved: "Token removed.",
      customTokens: "Custom tokens",
      customTokensHelp: `Stored in ${CUSTOM_TOKENS_KEY}.`,
      noCustomTokens: "No custom tokens for this network yet.",
      remove: "Remove",
    },
    pt: {
      portfolio: "Portfólio",
      subtitle: "Visual profissional de tokens com logos, DNR e base multi-rede.",
      assets: "Ativos",
      manage: "Gerenciar",
      detectTokens: "Detectar tokens",
      detectTokensHelp: "Escaneia tokens conhecidos da rede ativa.",
      detectNow: "Detectar agora",
      detecting: "Detectando...",
      detectionFinished: "Detecção concluída.",
      detectionFailed: "Não foi possível detectar tokens.",
      addCustomToken: "Adicionar token customizado",
      addCustomTokenHelp: "Cole um contrato ERC-20 da rede ativa.",
      contractAddress: "Endereço do contrato",
      addToken: "Adicionar token",
      adding: "Adicionando...",
      enterContract: "Digite o endereço do contrato.",
      invalidContract: "Contrato inválido.",
      tokenAdded: "Token adicionado.",
      tokenRemoved: "Token removido.",
      customTokens: "Tokens customizados",
      customTokensHelp: `Salvos em ${CUSTOM_TOKENS_KEY}.`,
      noCustomTokens: "Ainda não há tokens customizados nesta rede.",
      remove: "Remover",
    },
  };
  return map[lang] || map.en;
}

const topRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
function heroCard(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 26, background: isLight ? "linear-gradient(180deg,#fff 0%, #f8fbff 100%)" : "linear-gradient(180deg,#0f1829 0%, #101827 100%)", padding: 18 }; }
function toolbar(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 22, background: isLight ? "#fff" : "#101827", padding: 12 }; }
function eyebrow(isLight: boolean): React.CSSProperties { return { color: isLight ? "#55718f" : "#8ba1c8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }; }
function heroTitle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#0a1221" : "#fff", fontSize: 28, fontWeight: 900 }; }
function heroText(isLight: boolean): React.CSSProperties { return { marginTop: 8, color: isLight ? "#60718b" : "#92a5c9", fontSize: 14, lineHeight: 1.5 }; }
function tabStyle(active: boolean, isLight: boolean): React.CSSProperties { return { padding: "12px 14px", borderRadius: 16, border: active ? "1px solid rgba(79,124,255,.44)" : `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: active ? (isLight ? "#edf2ff" : "rgba(79,124,255,.18)") : (isLight ? "#fff" : "#0c1422"), color: active ? (isLight ? "#234fe2" : "#fff") : (isLight ? "#4d607e" : "#90a3c7"), cursor: "pointer", fontWeight: 800 }; }
function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 24, background: isLight ? "#fff" : "#101827", padding: 16 }; }
function miniCard(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#e4ebf7" : "#1c2b46"}`, borderRadius: 18, background: isLight ? "#f9fbff" : "#0c1422", padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }; }
function labelStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#09111f" : "#fff", fontWeight: 800, fontSize: 17 }; }
function subLabelStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#64748f" : "#90a3c7", fontSize: 13, marginTop: 6, marginBottom: 14, lineHeight: 1.45 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#f8fbff" : "#0c1422", color: isLight ? "#09111f" : "#fff", outline: "none", boxSizing: "border-box" }; }
const primaryButton: React.CSSProperties = { padding: "12px 14px", borderRadius: 16, border: "none", background: "linear-gradient(180deg,#26a6ff 0%, #4f7cff 100%)", color: "#fff", cursor: "pointer", fontWeight: 800 };
function secondaryButton(isLight: boolean): React.CSSProperties { return { padding: "10px 12px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#0c1422", color: isLight ? "#0f1830" : "#fff", cursor: "pointer", fontWeight: 700 }; }
