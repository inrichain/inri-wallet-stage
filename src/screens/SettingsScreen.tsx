import React, { useEffect, useRef, useState } from "react";
import { getSecuritySettings, saveSecuritySettings, type SecuritySettings } from "../lib/security";
import {
  addOrUpdateCustomNetwork,
  createNetworkDraft,
  getAllNetworks,
  getCustomNetworks,
  getStoredNetwork,
  removeCustomNetwork,
  saveStoredNetwork,
  type NetworkItem,
  validateRpcAgainstChainId,
} from "../lib/network";
import { tr, trf } from "../i18n/translations";
import { pairWalletConnect, getActiveSessions, disconnectSession, disconnectAllSessions } from "../lib/walletconnect";
import WalletConnectQrScanner from "../components/WalletConnectQrScanner";

const AVATAR_KEY = "wallet_avatar";

export default function SettingsScreen({ theme = "dark", setTheme, lang = "en", setLang, security = getSecuritySettings() }: {
  theme?: "dark" | "light";
  setTheme: (value: "dark" | "light") => void;
  lang?: string;
  setLang: (value: string) => void;
  security?: SecuritySettings;
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [allNetworks, setAllNetworks] = useState<NetworkItem[]>(getAllNetworks());
  const [customRpc, setCustomRpc] = useState(getStoredNetwork().rpcUrl || "");
  const [avatar, setAvatar] = useState<string>(localStorage.getItem(AVATAR_KEY) || "");
  const [wcUri, setWcUri] = useState("");
  const [wcSessions, setWcSessions] = useState<any[]>([]);
  const [wcLoading, setWcLoading] = useState(false);
  const [wcMessage, setWcMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [securityState, setSecurityState] = useState<SecuritySettings>(security);
  const [draft, setDraft] = useState<NetworkItem>(createNetworkDraft(8453));
  const [draftChainId, setDraftChainId] = useState("8453");
  const [draftBusy, setDraftBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const t = {
    settings: tr(lang, "settings"), subtitle: tr(lang, "settings_subtitle"), language: tr(lang, "settings_language"), theme: tr(lang, "settings_theme"), dark: tr(lang, "settings_dark"), light: tr(lang, "settings_light"), network: tr(lang, "settings_network"), networkHint: tr(lang, "settings_network_hint"), saveRpc: tr(lang, "settings_save_rpc"), active: tr(lang, "settings_active"), select: tr(lang, "settings_select"), avatar: tr(lang, "settings_avatar"), uploadAvatar: tr(lang, "settings_upload_avatar"), removeAvatar: tr(lang, "settings_remove_avatar"), avatarHint: tr(lang, "settings_avatar_hint"),
    wcTitle: tr(lang, "settings_walletconnect_title"), wcHint: tr(lang, "settings_walletconnect_hint"), wcConnecting: tr(lang, "settings_walletconnect_connecting"), wcConnectUri: tr(lang, "settings_walletconnect_connect_uri"), wcScanQr: tr(lang, "settings_walletconnect_scan_qr"), wcRefresh: tr(lang, "settings_walletconnect_refresh"), wcDisconnectAll: tr(lang, "settings_walletconnect_disconnect_all"), wcActiveSessions: tr(lang, "settings_walletconnect_active_sessions"), wcNoSessions: tr(lang, "settings_walletconnect_no_sessions"), wcNoUrl: tr(lang, "settings_walletconnect_no_url"), wcTopic: tr(lang, "settings_walletconnect_topic"), wcDisconnect: tr(lang, "settings_walletconnect_disconnect"),
    securityTitle: tr(lang, "settings_security_title"), securityAutolock: tr(lang, "settings_security_autolock"), securityAutolockHint: tr(lang, "settings_security_autolock_hint"), securityAutolockMinutes: tr(lang, "settings_security_autolock_minutes"), securityLockHidden: tr(lang, "settings_security_lock_hidden"), securityLockHiddenHint: tr(lang, "settings_security_lock_hidden_hint"), securityRequirePassword: tr(lang, "settings_security_require_password"), securityRequirePasswordHint: tr(lang, "settings_security_require_password_hint"),
  };

  useEffect(() => {
    setNetwork(getStoredNetwork());
    setAllNetworks(getAllNetworks());
    setCustomRpc(getStoredNetwork().rpcUrl || "");
    setSecurityState(security);
    refreshSessions();
  }, [security]);

  useEffect(() => {
    const id = window.setInterval(refreshSessions, 2000);
    const sync = () => {
      setNetwork(getStoredNetwork());
      setAllNetworks(getAllNetworks());
    };
    window.addEventListener("wallet-network-updated", sync as EventListener);
    window.addEventListener("wallet-networks-updated", sync as EventListener);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
      window.removeEventListener("wallet-networks-updated", sync as EventListener);
    };
  }, []);

  function showWcMessage(text: string) {
    setWcMessage(text);
    window.setTimeout(() => setWcMessage(""), 2800);
  }

  function refreshSessions() {
    try { setWcSessions(Array.isArray(getActiveSessions()) ? getActiveSessions() : []); } catch { setWcSessions([]); }
  }

  function handleSelectNetwork(item: NetworkItem) {
    saveStoredNetwork(item);
    setNetwork(item);
    setCustomRpc(item.rpcUrl || "");
    showWcMessage(trf(lang, "settings_network_changed", { name: item.name, chainId: item.chainId }));
  }

  function handleSaveRpc() {
    const next = { ...network, rpcUrl: customRpc.trim() || network.rpcUrl };
    saveStoredNetwork(next);
    setNetwork(next);
    showWcMessage(tr(lang, "settings_rpc_saved"));
  }

  function handleSecurityPatch(patch: Partial<SecuritySettings>) {
    const next = { ...securityState, ...patch };
    setSecurityState(next);
    saveSecuritySettings(next);
    window.dispatchEvent(new Event("wallet-security-updated"));
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

  async function connectWalletConnect(uri: string) {
    setWcLoading(true);
    try {
      await pairWalletConnect(uri.trim());
      setWcUri("");
      refreshSessions();
      showWcMessage("WalletConnect pairing started");
    } catch (err: any) {
      showWcMessage(err?.message || "Failed to connect WalletConnect");
    } finally {
      setWcLoading(false);
    }
  }

  async function handleConnectWc() {
    if (!wcUri.trim()) return showWcMessage(tr(lang, "settings_wc_paste_uri"));
    await connectWalletConnect(wcUri);
  }

  async function handleDisconnectSession(topic: string) {
    setWcLoading(true);
    try { await disconnectSession(topic); refreshSessions(); showWcMessage(tr(lang, "settings_wc_session_disconnected")); }
    catch (err: any) { showWcMessage(err?.message || tr(lang, "settings_wc_failed_disconnect")); }
    finally { setWcLoading(false); }
  }

  async function handleDisconnectAll() {
    setWcLoading(true);
    try { await disconnectAllSessions(); refreshSessions(); showWcMessage(tr(lang, "settings_wc_all_disconnected")); }
    catch (err: any) { showWcMessage(err?.message || tr(lang, "settings_wc_failed_disconnect_all")); }
    finally { setWcLoading(false); }
  }

  async function handleScannedUri(value: string) {
    setScannerOpen(false);
    setWcUri(value);
    showWcMessage(tr(lang, "settings_wc_qr_detected"));
    await connectWalletConnect(value);
  }

  function applyChainIdPreset(value: string) {
    setDraftChainId(value);
    const num = Number(value || 0);
    if (!num) return;
    setDraft(createNetworkDraft(num));
  }

  async function saveCustomNetworkAction() {
    if (!draft.name || !draft.chainId || !draft.rpcUrl) {
      showWcMessage("Fill name, chain ID and RPC URL.");
      return;
    }
    setDraftBusy(true);
    try {
      const ok = await validateRpcAgainstChainId(draft.rpcUrl, draft.chainId);
      if (!ok) {
        showWcMessage("RPC chainId is different from the informed chain ID.");
        return;
      }
      addOrUpdateCustomNetwork({ ...draft, isCustom: true });
      setAllNetworks(getAllNetworks());
      showWcMessage("Custom network saved.");
    } catch (err: any) {
      showWcMessage(err?.message || "Could not validate RPC.");
    } finally {
      setDraftBusy(false);
    }
  }

  const customNetworks = getCustomNetworks();

  return (
    <>
      <div style={{ display: "grid", gap: 18 }}>
        <div style={cardStyle(isLight)}><h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>{t.settings}</h2><div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3" }}>{t.subtitle}</div></div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.language}</div>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={inputStyle(isLight)}>
            <option value="en">English</option><option value="pt">Português</option><option value="es">Español</option><option value="fr">Français</option>
          </select>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.theme}</div>
          <select value={theme} onChange={(e) => setTheme(e.target.value as "dark" | "light")} style={inputStyle(isLight)}>
            <option value="dark">{t.dark}</option><option value="light">{t.light}</option>
          </select>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 18, marginBottom: 8 }}>{t.network}</div>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 16, lineHeight: 1.55 }}>{t.networkHint}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {allNetworks.map((item) => {
              const active = item.key === network.key && item.chainId === network.chainId;
              return (
                <button key={`${item.key}-${item.chainId}`} onClick={() => handleSelectNetwork(item)} style={{ textAlign: "left", padding: 14, borderRadius: 18, border: active ? "1px solid #4d7ef2" : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: active ? (isLight ? "#eef4ff" : "#16213b") : isLight ? "#ffffff" : "#121621", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={item.logo} alt={item.name} onError={(e)=>((e.currentTarget as HTMLImageElement).style.display='none')} style={{ width: 28, height: 28, borderRadius: 14, objectFit: "contain" }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 17 }}>{item.name}</div>
                      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginTop: 3 }}>Chain ID {item.chainId} • {item.symbol}</div>
                    </div>
                    <div style={{ color: active ? "#3f7cff" : isLight ? "#64748b" : "#94a3b8", fontWeight: 800, fontSize: 14 }}>{active ? t.active : t.select}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <input value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder="Custom RPC URL" style={{ ...inputStyle(isLight), marginTop: 14 }} />
          <div style={{ marginTop: 14 }}><button onClick={handleSaveRpc} style={mainButtonStyle()}>{t.saveRpc}</button></div>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 18, marginBottom: 10 }}>Add or edit network</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input value={draftChainId} onChange={(e) => applyChainIdPreset(e.target.value)} placeholder="Chain ID" style={inputStyle(isLight)} />
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Network name" style={inputStyle(isLight)} />
            <input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} placeholder="Symbol" style={inputStyle(isLight)} />
            <input value={draft.rpcUrl} onChange={(e) => setDraft({ ...draft, rpcUrl: e.target.value })} placeholder="RPC URL" style={inputStyle(isLight)} />
            <input value={draft.explorerAddressUrl} onChange={(e) => setDraft({ ...draft, explorerAddressUrl: e.target.value })} placeholder="Explorer address URL" style={inputStyle(isLight)} />
            <input value={draft.explorerTxUrl} onChange={(e) => setDraft({ ...draft, explorerTxUrl: e.target.value })} placeholder="Explorer tx URL" style={inputStyle(isLight)} />
            <input value={draft.logo} onChange={(e) => setDraft({ ...draft, logo: e.target.value })} placeholder="Logo URL or data:image" style={{ ...inputStyle(isLight), gridColumn: "1 / -1" }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={saveCustomNetworkAction} disabled={draftBusy} style={mainButtonStyle()}>{draftBusy ? "Saving..." : "Save custom network"}</button>
            {draft.chainId ? <button onClick={() => removeCustomNetwork(draft.chainId)} style={secondaryButtonStyle(isLight)}>Remove by chain ID</button> : null}
          </div>
          {customNetworks.length ? <div style={{ marginTop: 14, display: "grid", gap: 10 }}>{customNetworks.map((item) => <div key={item.chainId} style={{ padding: 12, borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div><div style={{ color: isLight ? "#64748b" : "#94a3b8", fontSize: 13 }}>Chain ID {item.chainId} • {item.symbol}</div></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => setDraft(item)} style={secondaryButtonStyle(isLight)}>Edit</button><button onClick={() => removeCustomNetwork(item.chainId)} style={secondaryButtonStyle(isLight)}>Delete</button></div></div>)}</div> : null}
        </div>

        <div style={cardStyle(isLight)}>
          <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 18, marginBottom: 8 }}>{t.wcTitle}</div>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 14, lineHeight: 1.55 }}>{t.wcHint}</div>
          <textarea value={wcUri} onChange={(e) => setWcUri(e.target.value)} placeholder="wc:..." style={{ ...inputStyle(isLight), minHeight: 96, resize: "vertical", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={handleConnectWc} disabled={wcLoading} style={mainButtonStyle()}>{wcLoading ? t.wcConnecting : t.wcConnectUri}</button>
            <button onClick={() => setScannerOpen(true)} disabled={wcLoading} style={secondaryButtonStyle(isLight)}>{t.wcScanQr}</button>
            <button onClick={refreshSessions} disabled={wcLoading} style={secondaryButtonStyle(isLight)}>{t.wcRefresh}</button>
            <button onClick={handleDisconnectAll} disabled={wcLoading || wcSessions.length === 0} style={secondaryButtonStyle(isLight)}>{t.wcDisconnectAll}</button>
          </div>
          {wcMessage ? <div style={{ marginBottom: 14, color: "#3f7cff", fontWeight: 700, fontSize: 13 }}>{wcMessage}</div> : null}
          <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 15, marginBottom: 10 }}>{t.wcActiveSessions}</div>
          {wcSessions.length === 0 ? <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>{t.wcNoSessions}</div> : <div style={{ display: "grid", gap: 10 }}>{wcSessions.map((session) => <div key={session.topic} style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 14, padding: 12, background: isLight ? "#f8faff" : "#0f1420" }}><div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", marginBottom: 4 }}>{session.name}</div><div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3", marginBottom: 8, wordBreak: "break-word" }}>{session.url || t.wcNoUrl}</div><div style={{ fontSize: 11, color: isLight ? "#6a7488" : "#8f99ad", marginBottom: 10, wordBreak: "break-word" }}>{t.wcTopic}: {session.topic}</div><button onClick={() => handleDisconnectSession(session.topic)} disabled={wcLoading} style={secondaryButtonStyle(isLight)}>{t.wcDisconnect}</button></div>)}</div>}
        </div>

        <div style={cardStyle(isLight)}>
          <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 18, marginBottom: 14 }}>{t.avatar}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}`, background: isLight ? "#f8fafc" : "#0b1120", display: "grid", placeItems: "center" }}>{avatar ? <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: 36, height: 36, borderRadius: "50%", background: isLight ? "#cbd5e1" : "#334155" }} />}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button onClick={() => fileRef.current?.click()} style={mainButtonStyle()}>{t.uploadAvatar}</button><button onClick={handleRemoveAvatar} style={secondaryButtonStyle(isLight)}>{t.removeAvatar}</button></div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadAvatar} style={{ display: "none" }} />
          <div style={{ marginTop: 14, color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.55 }}>{t.avatarHint}</div>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", fontSize: 18, marginBottom: 8 }}>{t.securityTitle}</div>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}><span style={labelStyle(isLight)}>{t.securityAutolock}</span><span style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>{t.securityAutolockHint}</span><input type="checkbox" checked={securityState.autoLockEnabled} onChange={(e) => handleSecurityPatch({ autoLockEnabled: e.target.checked })} /></label>
            <label style={{ display: "grid", gap: 6 }}><span style={labelStyle(isLight)}>{t.securityAutolockMinutes}</span><input type="number" min={1} max={120} value={securityState.autoLockMinutes} onChange={(e) => handleSecurityPatch({ autoLockMinutes: Math.max(1, Number(e.target.value || 5)) })} style={inputStyle(isLight)} /></label>
            <label style={{ display: "grid", gap: 6 }}><span style={labelStyle(isLight)}>{t.securityLockHidden}</span><span style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>{t.securityLockHiddenHint}</span><input type="checkbox" checked={securityState.lockOnHidden} onChange={(e) => handleSecurityPatch({ lockOnHidden: e.target.checked })} /></label>
            <label style={{ display: "grid", gap: 6 }}><span style={labelStyle(isLight)}>{t.securityRequirePassword}</span><span style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>{t.securityRequirePasswordHint}</span><input type="checkbox" checked={securityState.requirePasswordForSensitiveActions} onChange={(e) => handleSecurityPatch({ requirePasswordForSensitiveActions: e.target.checked })} /></label>
          </div>
        </div>
      </div>
      <WalletConnectQrScanner open={scannerOpen} theme={theme} lang={lang} onClose={() => setScannerOpen(false)} onScan={handleScannedUri} />
    </>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 }; }
function labelStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginBottom: 10 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#f6f8fc" : "#0d111b", color: isLight ? "#10131a" : "#ffffff", outline: "none", boxSizing: "border-box" }; }
function mainButtonStyle(): React.CSSProperties { return { padding: "12px 16px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 15 }; }
function secondaryButtonStyle(isLight: boolean): React.CSSProperties { return { padding: "12px 16px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#ffffff" : "#121621", color: isLight ? "#10131a" : "#ffffff", cursor: "pointer", fontWeight: 800, fontSize: 15 }; }
