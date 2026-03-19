import { getSecuritySettings, saveSecuritySettings, type SecuritySettings } from "../lib/security";
import React, { useEffect, useRef, useState } from "react";
import {
  getAllNetworks,
  getStoredNetwork,
  saveStoredNetwork,
  upsertCustomNetwork,
  removeCustomNetwork,
  type NetworkItem,
} from "../lib/network";
import { tr, trf } from "../i18n/translations";
import {
  pairWalletConnect,
  getActiveSessions,
  disconnectSession,
  disconnectAllSessions,
} from "../lib/walletconnect";
import WalletConnectQrScanner from "../components/WalletConnectQrScanner";
import { listSitePermissions, revokeSitePermission } from "../lib/sitePermissions";

const AVATAR_KEY = "wallet_avatar";
const BASE = import.meta.env.BASE_URL || "/";

type CustomNetworkDraft = {
  name: string;
  chainId: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
};

export default function SettingsScreen({
  theme = "dark",
  setTheme,
  lang = "en",
  setLang,
  security = getSecuritySettings(),
}: {
  theme?: "dark" | "light";
  setTheme: (value: "dark" | "light") => void;
  lang?: string;
  setLang: (value: string) => void;
  security?: SecuritySettings;
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [customRpc, setCustomRpc] = useState(getStoredNetwork().rpcUrl || "");
  const [avatar, setAvatar] = useState<string>(localStorage.getItem(AVATAR_KEY) || "");
  const [wcUri, setWcUri] = useState("");
  const [wcSessions, setWcSessions] = useState<any[]>([]);
  const [wcLoading, setWcLoading] = useState(false);
  const [wcMessage, setWcMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [securityState, setSecurityState] = useState<SecuritySettings>(security);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [draft, setDraft] = useState<CustomNetworkDraft>({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "" });
  const [networkValidation, setNetworkValidation] = useState<{ status: "idle" | "checking" | "ok" | "error"; message: string }>({ status: "idle", message: "" });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const t = {
    rpcPlaceholder: tr(lang, "settings_rpc_placeholder"),
    wcTitle: tr(lang, "settings_walletconnect_title"),
    wcHint: tr(lang, "settings_walletconnect_hint"),
    wcConnecting: tr(lang, "settings_walletconnect_connecting"),
    wcConnectUri: tr(lang, "settings_walletconnect_connect_uri"),
    wcScanQr: tr(lang, "settings_walletconnect_scan_qr"),
    wcRefresh: tr(lang, "settings_walletconnect_refresh"),
    wcDisconnectAll: tr(lang, "settings_walletconnect_disconnect_all"),
    wcActiveSessions: tr(lang, "settings_walletconnect_active_sessions"),
    wcNoSessions: tr(lang, "settings_walletconnect_no_sessions"),
    wcNoUrl: tr(lang, "settings_walletconnect_no_url"),
    wcTopic: tr(lang, "settings_walletconnect_topic"),
    wcDisconnect: tr(lang, "settings_walletconnect_disconnect"),
    securityTitle: tr(lang, "settings_security_title"),
    securityAutolock: tr(lang, "settings_security_autolock"),
    securityAutolockHint: tr(lang, "settings_security_autolock_hint"),
    securityAutolockMinutes: tr(lang, "settings_security_autolock_minutes"),
    securityLockHidden: tr(lang, "settings_security_lock_hidden"),
    securityLockHiddenHint: tr(lang, "settings_security_lock_hidden_hint"),
    securityRequirePassword: tr(lang, "settings_security_require_password"),
    securityRequirePasswordHint: tr(lang, "settings_security_require_password_hint"),
    settings: tr(lang, "settings"),
    subtitle: tr(lang, "settings_subtitle"),
    language: tr(lang, "settings_language"),
    theme: tr(lang, "settings_theme"),
    dark: tr(lang, "settings_dark"),
    light: tr(lang, "settings_light"),
    network: tr(lang, "settings_network"),
    networkHint: tr(lang, "settings_network_hint"),
    saveRpc: tr(lang, "settings_save_rpc"),
    active: tr(lang, "settings_active"),
    select: tr(lang, "settings_select"),
    avatar: tr(lang, "settings_avatar"),
    uploadAvatar: tr(lang, "settings_upload_avatar"),
    removeAvatar: tr(lang, "settings_remove_avatar"),
    avatarHint: tr(lang, "settings_avatar_hint"),
  };

  const networks = getAllNetworks();

  useEffect(() => {
    setNetwork(getStoredNetwork());
    setCustomRpc(getStoredNetwork().rpcUrl || "");
    setSecurityState(security);
    setPermissions(listSitePermissions());
    refreshSessions();
  }, [security]);

  useEffect(() => {
    const id = window.setInterval(() => refreshSessions(), 2000);
    const sync = () => {
      setNetwork(getStoredNetwork());
      setPermissions(listSitePermissions());
    };
    window.addEventListener("wallet-site-permissions-updated", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("wallet-site-permissions-updated", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
    };
  }, []);

  function showWcMessage(text: string) {
    setWcMessage(text);
    window.setTimeout(() => setWcMessage(""), 2800);
  }

  function refreshSessions() {
    try {
      const list = getActiveSessions();
      setWcSessions(Array.isArray(list) ? list : []);
    } catch {
      setWcSessions([]);
    }
  }

  function handleSelectNetwork(item: NetworkItem) {
    saveStoredNetwork(item);
    setNetwork(item);
    setCustomRpc(item.rpcUrl || "");
    window.dispatchEvent(new Event("wallet-network-updated"));
    showWcMessage(trf(lang, "settings_network_changed", { name: item.name, chainId: item.chainId }));
  }

  function handleSaveRpc() {
    const next = { ...network, rpcUrl: customRpc.trim() || network.rpcUrl };
    saveStoredNetwork(next);
    if (network.isCustom) {
      upsertCustomNetwork(next);
    }
    setNetwork(next);
    window.dispatchEvent(new Event("wallet-network-updated"));
    showWcMessage(tr(lang, "settings_rpc_saved"));
  }

  function isSuspiciousRpcUrl(value: string) {
    const url = value.trim();
    if (!url) return true;
    if (/^https:\/\//i.test(url)) return false;
    if (/^http:\/\/(127\.0\.0\.1|localhost|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(url)) return false;
    return true;
  }

  async function validateNetworkDraftInput() {
    const chainId = Number(draft.chainId);
    if (!draft.name.trim() || !Number.isFinite(chainId) || chainId <= 0 || !draft.rpcUrl.trim()) {
      setNetworkValidation({ status: "error", message: "Fill network name, valid chain ID and RPC URL." });
      return null;
    }
    if (isSuspiciousRpcUrl(draft.rpcUrl)) {
      setNetworkValidation({ status: "error", message: "Use HTTPS RPC URLs unless this is a trusted local RPC." });
      return null;
    }
    setNetworkValidation({ status: "checking", message: "Validating RPC endpoint..." });
    try {
      const response = await fetch(draft.rpcUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const json = await response.json();
      const remoteChainId = typeof json?.result === "string" && json.result.startsWith("0x") ? Number(BigInt(json.result)) : Number(json?.result);
      if (!Number.isFinite(remoteChainId)) {
        setNetworkValidation({ status: "error", message: "RPC did not return a valid chain ID." });
        return null;
      }
      if (remoteChainId !== chainId) {
        setNetworkValidation({ status: "error", message: `RPC chain ID mismatch: expected ${chainId}, received ${remoteChainId}.` });
        return null;
      }
      const statusMessage = getAllNetworks().some((item) => Number(item.chainId) === chainId && item.name !== draft.name.trim())
        ? `RPC verified for chain ${chainId}. This overrides an existing network entry.`
        : `RPC verified for chain ${chainId}.`;
      setNetworkValidation({ status: "ok", message: statusMessage });
      return { chainId, remoteChainId };
    } catch (error: any) {
      setNetworkValidation({ status: "error", message: error?.message || "RPC validation failed." });
      return null;
    }
  }

  async function handleAddOrUpdateCustomNetwork() {
    const validated = await validateNetworkDraftInput();
    if (!validated) {
      showWcMessage("Custom network validation failed.");
      return;
    }

    const chainId = Number(draft.chainId);
    const explorer = draft.explorerUrl.trim().replace(/\/$/, "");
    const created = upsertCustomNetwork({
      key: `custom-${chainId}`,
      name: draft.name.trim(),
      chainId,
      symbol: draft.symbol.trim() || "ETH",
      rpcUrl: draft.rpcUrl.trim(),
      explorerAddressUrl: explorer ? `${explorer}/address/` : "",
      explorerTxUrl: explorer ? `${explorer}/tx/` : "",
      logo: networks.find((item) => item.chainId === chainId)?.logo || `${BASE}network-inri.png`,
      isCustom: true,
    });
    setDraft({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "" });
    handleSelectNetwork(created);
    showWcMessage(`Network saved: ${created.name}`);
  }


  function handleEditCustomNetwork(item: NetworkItem) {
    setDraft({
      name: item.name,
      chainId: String(item.chainId),
      symbol: item.symbol,
      rpcUrl: item.rpcUrl,
      explorerUrl: (item.explorerAddressUrl || item.explorerTxUrl || "").replace(/\/(address|tx)\/?$/, ""),
    });
  }

  function handleDeleteCustomNetwork(item: NetworkItem) {
    removeCustomNetwork(item.key);
    if (Number(network.chainId) === Number(item.chainId)) {
      handleSelectNetwork(getAllNetworks()[0]);
    }
    showWcMessage(`Removed network: ${item.name}`);
  }

  function handleSecurityPatch(patch: Partial<SecuritySettings>) {
    const next = { ...securityState, ...patch };
    setSecurityState(next);
    saveSecuritySettings(next);
    showWcMessage(tr(lang, "settings_security_saved"));
  }

  function handleUploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      localStorage.setItem(AVATAR_KEY, result);
      setAvatar(result);
      window.dispatchEvent(new Event("wallet-avatar-updated"));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    localStorage.removeItem(AVATAR_KEY);
    setAvatar("");
    window.dispatchEvent(new Event("wallet-avatar-updated"));
  }

  async function handleConnectWc() {
    if (!wcUri.trim()) {
      showWcMessage(tr(lang, "settings_wc_paste_uri"));
      return;
    }
    setWcLoading(true);
    try {
      await pairWalletConnect(wcUri.trim());
      setWcUri("");
      refreshSessions();
      showWcMessage(tr(lang, "settings_wc_pairing_started"));
    } catch (err: any) {
      console.error(err);
      showWcMessage(err?.message || tr(lang, "settings_wc_failed_connect"));
    } finally {
      setWcLoading(false);
    }
  }

  async function handleDisconnectSession(topic: string) {
    setWcLoading(true);
    try {
      await disconnectSession(topic);
      refreshSessions();
      showWcMessage(tr(lang, "settings_wc_session_disconnected"));
    } catch (err: any) {
      console.error(err);
      showWcMessage(err?.message || tr(lang, "settings_wc_failed_disconnect"));
    } finally {
      setWcLoading(false);
    }
  }

  async function handleDisconnectAll() {
    setWcLoading(true);
    try {
      await disconnectAllSessions();
      refreshSessions();
      showWcMessage(tr(lang, "settings_wc_all_disconnected"));
    } catch (err: any) {
      console.error(err);
      showWcMessage(err?.message || tr(lang, "settings_wc_failed_disconnect_all"));
    } finally {
      setWcLoading(false);
    }
  }

  function handleScannedUri(value: string) {
    setScannerOpen(false);
    setWcUri(value);
    showWcMessage(tr(lang, "settings_wc_qr_detected"));
  }

  function refreshPermissions() {
    setPermissions(listSitePermissions());
  }

  return (
    <>
      <div style={{ display: "grid", gap: 18 }}>
        <Panel isLight={isLight}>
          <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>{t.settings}</h2>
          <div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3" }}>{t.subtitle}</div>
        </Panel>

        <Panel isLight={isLight}>
          <div style={labelStyle(isLight)}>{t.language}</div>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={inputStyle(isLight)}>
            <option value="en">English</option><option value="pt">Português</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="ru">Русский</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="tr">Türkçe</option>
          </select>
        </Panel>

        <Panel isLight={isLight}>
          <div style={labelStyle(isLight)}>{t.theme}</div>
          <select value={theme} onChange={(e) => setTheme(e.target.value as "dark" | "light")} style={inputStyle(isLight)}>
            <option value="dark">{t.dark}</option>
            <option value="light">{t.light}</option>
          </select>
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>{t.network}</SectionTitle>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 16, lineHeight: 1.55 }}>{t.networkHint}</div>
          <div style={networkGrid}>
            {networks.map((item) => {
              const active = Number(item.chainId) === Number(network.chainId);
              return (
                <button key={`${item.key}-${item.chainId}`} onClick={() => handleSelectNetwork(item)} style={networkCard(isLight, active)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={item.logo} alt={item.name} style={{ width: 28, height: 28, borderRadius: 14, objectFit: "contain" }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 17 }}>{item.name}</div>
                      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginTop: 3 }}>Chain ID {item.chainId} • {item.symbol}{item.isCustom ? " • Custom" : ""}</div>
                    </div>
                    <div style={{ color: active ? "#3f7cff" : isLight ? "#64748b" : "#94a3b8", fontWeight: 800, fontSize: 14 }}>{active ? t.active : t.select}</div>
                  </div>
                  {item.isCustom ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditCustomNetwork(item); }} style={smallButton(isLight)}>Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomNetwork(item); }} style={smallDangerButton()}>Remove</button>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <div style={labelStyle(isLight)}>RPC URL</div>
            <input value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder={t.rpcPlaceholder} style={inputStyle(isLight)} />
            <button onClick={handleSaveRpc} style={primaryButton}>{t.saveRpc}</button>
          </div>
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>Custom networks</SectionTitle>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 14, lineHeight: 1.55 }}>Add, edit or remove RPC networks so the wallet behaves more like MetaMask and OKX.</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Network name" style={inputStyle(isLight)} />
            <input value={draft.chainId} onChange={(e) => setDraft({ ...draft, chainId: e.target.value })} placeholder="Chain ID" style={inputStyle(isLight)} />
            <input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} placeholder="Symbol" style={inputStyle(isLight)} />
            <input value={draft.rpcUrl} onChange={(e) => setDraft({ ...draft, rpcUrl: e.target.value })} placeholder="RPC URL" style={inputStyle(isLight)} />
            <input value={draft.explorerUrl} onChange={(e) => setDraft({ ...draft, explorerUrl: e.target.value })} placeholder="Explorer base URL" style={inputStyle(isLight)} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={handleAddOrUpdateCustomNetwork} style={primaryButton}>Save custom network</button>
            <button onClick={() => setDraft({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "" })} style={secondaryButton(isLight)}>Clear</button>
          </div>
          {networkValidation.status !== "idle" ? (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: networkValidation.status === "ok" ? (isLight ? "#eefaf1" : "rgba(74,222,128,.08)") : networkValidation.status === "checking" ? (isLight ? "#eef4ff" : "rgba(63,124,255,.08)") : (isLight ? "#fff3f3" : "rgba(255,123,123,.08)"), border: `1px solid ${networkValidation.status === "ok" ? "rgba(74,222,128,.28)" : networkValidation.status === "checking" ? "rgba(63,124,255,.22)" : "rgba(255,123,123,.22)"}`, color: isLight ? "#10131a" : "#fff" }}>{networkValidation.message}</div>
          ) : null}
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>Connection center</SectionTitle>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 14, lineHeight: 1.55 }}>A single place to review browser permissions, WalletConnect sessions and the networks they can use.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <div style={sessionCard(isLight)}><div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>Connected sites</div><div style={{ fontSize: 24, fontWeight: 900, color: isLight ? "#10131a" : "#fff" }}>{permissions.length}</div></div>
            <div style={sessionCard(isLight)}><div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>WalletConnect sessions</div><div style={{ fontSize: 24, fontWeight: 900, color: isLight ? "#10131a" : "#fff" }}>{wcSessions.length}</div></div>
            <div style={sessionCard(isLight)}><div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>Active network</div><div style={{ fontSize: 24, fontWeight: 900, color: isLight ? "#10131a" : "#fff" }}>{network.name}</div><div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>Chain ID {network.chainId}</div></div>
          </div>
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>Connected sites</SectionTitle>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 14, lineHeight: 1.55 }}>Permissions are now stored by dApp so users can review and revoke access later.</div>
          <div style={{ display: "grid", gap: 10 }}>
            {permissions.length === 0 ? (
              <div style={emptyBox(isLight)}>No saved site permissions yet.</div>
            ) : permissions.map((item) => (
              <div key={item.id} style={sessionCard(isLight)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>{item.name}</div>
                    <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, wordBreak: "break-all" }}>{item.origin}</div>
                    <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12, marginTop: 8 }}>Chains: {(item.chains || []).join(", ") || "-"}</div>
                    <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12, marginTop: 4 }}>Methods: {(item.methods || []).join(", ") || "-"}</div>
                  </div>
                  <button onClick={() => { revokeSitePermission(item.id); refreshPermissions(); }} style={smallDangerButton()}>Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>{t.wcTitle}</SectionTitle>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 14, lineHeight: 1.55 }}>{t.wcHint}</div>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={wcUri} onChange={(e) => setWcUri(e.target.value)} placeholder={t.wcConnectUri} style={inputStyle(isLight)} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleConnectWc} style={primaryButton} disabled={wcLoading}>{wcLoading ? t.wcConnecting : "Connect"}</button>
              <button onClick={() => setScannerOpen(true)} style={secondaryButton(isLight)}>{t.wcScanQr}</button>
              <button onClick={refreshSessions} style={secondaryButton(isLight)}>{t.wcRefresh}</button>
              <button onClick={handleDisconnectAll} style={secondaryButton(isLight)}>{t.wcDisconnectAll}</button>
            </div>
            {wcMessage ? <div style={{ color: "#3f7cff", fontWeight: 700, fontSize: 13 }}>{wcMessage}</div> : null}
          </div>
          <div style={{ marginTop: 16, fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>{t.wcActiveSessions}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {wcSessions.length === 0 ? <div style={emptyBox(isLight)}>{t.wcNoSessions}</div> : wcSessions.map((session) => (
              <div key={session.topic} style={sessionCard(isLight)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>{session.name}</div>
                    <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, wordBreak: "break-all" }}>{session.url || t.wcNoUrl}</div>
                    <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12, marginTop: 8 }}>{t.wcTopic}: {session.topic}</div>
                  </div>
                  <button onClick={() => handleDisconnectSession(session.topic)} style={smallDangerButton()}>{t.wcDisconnect}</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>{t.securityTitle}</SectionTitle>
          <div style={toggleRow(isLight)}>
            <div>
              <div style={{ fontWeight: 800 }}>{t.securityRequirePassword}</div>
              <div style={hintStyle(isLight)}>{t.securityRequirePasswordHint}</div>
            </div>
            <input type="checkbox" checked={!!securityState.requirePasswordForSensitiveActions} onChange={(e) => handleSecurityPatch({ requirePasswordForSensitiveActions: e.target.checked })} />
          </div>
          <div style={toggleRow(isLight)}>
            <div>
              <div style={{ fontWeight: 800 }}>{t.securityLockHidden}</div>
              <div style={hintStyle(isLight)}>{t.securityLockHiddenHint}</div>
            </div>
            <input type="checkbox" checked={!!securityState.lockOnHidden} onChange={(e) => handleSecurityPatch({ lockOnHidden: e.target.checked })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t.securityAutolock}</div>
            <div style={hintStyle(isLight)}>{t.securityAutolockHint}</div>
            <input type="number" min={0} value={securityState.autoLockMinutes || 0} onChange={(e) => handleSecurityPatch({ autoLockMinutes: Math.max(0, Number(e.target.value) || 0) })} placeholder={t.securityAutolockMinutes} style={{ ...inputStyle(isLight), marginTop: 10 }} />
          </div>
        </Panel>

        <Panel isLight={isLight}>
          <SectionTitle isLight={isLight}>{t.avatar}</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <img src={avatar || `${BASE}avatar.png`} alt="avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}` }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => fileRef.current?.click()} style={primaryButton}>{t.uploadAvatar}</button>
              <button onClick={handleRemoveAvatar} style={secondaryButton(isLight)}>{t.removeAvatar}</button>
            </div>
          </div>
          <div style={{ marginTop: 10, color: isLight ? "#5b6578" : "#97a0b3" }}>{t.avatarHint}</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadAvatar} style={{ display: "none" }} />
        </Panel>
      </div>

      {scannerOpen ? <WalletConnectQrScanner open={scannerOpen} theme={theme} onClose={() => setScannerOpen(false)} onScanned={handleScannedUri} /> : null}
    </>
  );
}

function Panel({ children, isLight }: { children: React.ReactNode; isLight: boolean }) {
  return <div style={cardStyle(isLight)}>{children}</div>;
}
function SectionTitle({ children, isLight }: { children: React.ReactNode; isLight: boolean }) {
  return <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 18, marginBottom: 8 }}>{children}</div>;
}

const networkGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 22, background: isLight ? "rgba(255,255,255,.94)" : "rgba(18,22,33,.92)", padding: 18, boxShadow: isLight ? "0 16px 40px rgba(20,30,60,.06)" : "0 16px 40px rgba(0,0,0,.22)" }; }
function labelStyle(isLight: boolean): React.CSSProperties { return { fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", marginBottom: 10 }; }
function hintStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", height: 48, borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#2c3950"}`, background: isLight ? "#ffffff" : "#0f1624", color: isLight ? "#10131a" : "#ffffff", padding: "0 14px", boxSizing: "border-box" }; }
function networkCard(isLight: boolean, active: boolean): React.CSSProperties { return { textAlign: "left", padding: 14, borderRadius: 18, border: active ? "1px solid #4d7ef2" : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: active ? isLight ? "#eef4ff" : "#16213b" : isLight ? "#ffffff" : "#121621", cursor: "pointer" }; }
const primaryButton: React.CSSProperties = { height: 46, borderRadius: 14, border: "none", background: "#3f7cff", color: "#fff", fontWeight: 800, padding: "0 16px", cursor: "pointer" };
function secondaryButton(isLight: boolean): React.CSSProperties { return { height: 46, borderRadius: 14, border: `1px solid ${isLight ? "#d3dceb" : "#2c3950"}`, background: "transparent", color: isLight ? "#10131a" : "#fff", fontWeight: 800, padding: "0 16px", cursor: "pointer" }; }
function smallButton(isLight: boolean): React.CSSProperties { return { height: 34, borderRadius: 12, border: `1px solid ${isLight ? "#d3dceb" : "#2c3950"}`, background: "transparent", color: isLight ? "#10131a" : "#fff", fontWeight: 700, padding: "0 12px", cursor: "pointer" }; }
function smallDangerButton(): React.CSSProperties { return { height: 34, borderRadius: 12, border: "1px solid rgba(255,123,123,.32)", background: "rgba(255,123,123,.08)", color: "#ff8d8d", fontWeight: 700, padding: "0 12px", cursor: "pointer" }; }
function emptyBox(isLight: boolean): React.CSSProperties { return { padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dde6f3" : "#223044"}`, background: isLight ? "#f8fbff" : "#0d1420", color: isLight ? "#5b6578" : "#97a0b3" }; }
function sessionCard(isLight: boolean): React.CSSProperties { return { padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dde6f3" : "#223044"}`, background: isLight ? "#f8fbff" : "#0d1420" }; }
function toggleRow(isLight: boolean): React.CSSProperties { return { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, marginTop: 12, borderRadius: 16, border: `1px solid ${isLight ? "#dde6f3" : "#223044"}`, background: isLight ? "#f8fbff" : "#0d1420" }; }
