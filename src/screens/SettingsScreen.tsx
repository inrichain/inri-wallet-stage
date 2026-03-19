import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSecuritySettings, saveSecuritySettings, type SecuritySettings } from "../lib/security";
import {
  getAllNetworks,
  getStoredNetwork,
  saveStoredNetwork,
  upsertCustomNetwork,
  removeCustomNetwork,
  findPresetByChainId,
  makeNetworkFromChainId,
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
import {
  listSitePermissions,
  revokeSitePermission,
  revokeAllSitePermissions,
  type SitePermission,
} from "../lib/sitePermissions";
import LogoImage from "../components/LogoImage";
import {
  getAssetRegistry,
  updateAssetRegistryEntry,
  resetAssetRegistry,
  resolveDappAsset,
  resolveNetworkAsset,
  resolveTokenAsset,
  resolveWalletAsset,
  sanitizeAssetKey,
} from "../lib/assets";

const AVATAR_KEY = "wallet_avatar";
const BASE = import.meta.env.BASE_URL || "/";

type CustomNetworkDraft = {
  name: string;
  chainId: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  logo: string;
};

type RegistryDraft = {
  networkKey: string;
  networkPath: string;
  tokenKey: string;
  tokenPath: string;
  dappKey: string;
  dappPath: string;
  walletKey: string;
  walletPath: string;
};

type IntegrationCard = {
  key: string;
  title: string;
  subtitle: string;
  badge: string;
  action: () => void;
  state: "live" | "soon";
  logoKey?: string;
  logoPath?: string;
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
  const text = isLight ? "#10131a" : "#ffffff";
  const muted = isLight ? "#5b6578" : "#97a0b3";
  const border = isLight ? "#dbe2f0" : "#273042";
  const panelBg = isLight ? "#ffffff" : "#111722";

  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [customRpc, setCustomRpc] = useState(getStoredNetwork().rpcUrl || "");
  const [avatar, setAvatar] = useState<string>(localStorage.getItem(AVATAR_KEY) || "");
  const [networkQuery, setNetworkQuery] = useState("");
  const [wcUri, setWcUri] = useState("");
  const [wcSessions, setWcSessions] = useState<any[]>([]);
  const [wcLoading, setWcLoading] = useState(false);
  const [wcMessage, setWcMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [securityState, setSecurityState] = useState<SecuritySettings>(security);
  const [permissions, setPermissions] = useState<SitePermission[]>([]);
  const [draft, setDraft] = useState<CustomNetworkDraft>({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" });
  const [registryDraft, setRegistryDraft] = useState<RegistryDraft>({
    networkKey: "",
    networkPath: "",
    tokenKey: "",
    tokenPath: "",
    dappKey: "",
    dappPath: "",
    walletKey: "",
    walletPath: "",
  });
  const [networkValidation, setNetworkValidation] = useState<{ status: "idle" | "checking" | "ok" | "error"; message: string }>({ status: "idle", message: "" });
  const [assetVersion, setAssetVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const walletConnectRef = useRef<HTMLDivElement | null>(null);
  const registryFileRef = useRef<HTMLInputElement | null>(null);

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
      setAssetVersion((v) => v + 1);
    };
    const openWalletConnect = () => {
      window.setTimeout(() => {
        walletConnectRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    };
    window.addEventListener("wallet-site-permissions-updated", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    window.addEventListener("wallet-assets-updated", sync as EventListener);
    window.addEventListener("wallet-open-wc", openWalletConnect as EventListener);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("wallet-site-permissions-updated", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
      window.removeEventListener("wallet-assets-updated", sync as EventListener);
      window.removeEventListener("wallet-open-wc", openWalletConnect as EventListener);
    };
  }, []);

  const filteredNetworks = useMemo(() => {
    const q = networkQuery.trim().toLowerCase();
    if (!q) return networks;
    return networks.filter((item) => [item.name, item.symbol, String(item.chainId)].join(" ").toLowerCase().includes(q));
  }, [networkQuery, networks]);

  const permissionSummary = useMemo(() => {
    const browser = permissions.filter((item) => item.type === "browser").length;
    const walletconnect = permissions.filter((item) => item.type === "walletconnect").length;
    const methods = new Set(permissions.flatMap((item) => item.methods || [])).size;
    return { browser, walletconnect, methods, total: permissions.length };
  }, [permissions]);

  const registry = useMemo(() => getAssetRegistry(), [assetVersion]);

  const integrationCards: IntegrationCard[] = useMemo(() => [
    {
      key: "ledger",
      logoKey: "ledger",
      title: "Ledger",
      subtitle: "Premium card ready for desktop and mobile layouts.",
      badge: "Soon",
      state: "soon",
      action: () => showWcMessage("Ledger UI card added. Native hardware flow still needs integration."),
    },
    {
      key: "trezor",
      logoKey: "trezor",
      title: "Trezor",
      subtitle: "Hardware wallet entry styled like top wallets.",
      badge: "Soon",
      state: "soon",
      action: () => showWcMessage("Trezor card added. The connection backend is not wired yet."),
    },
    {
      key: "lattice",
      logoKey: "lattice",
      title: "Lattice",
      subtitle: "Ready for future expansion without changing the layout.",
      badge: "Soon",
      state: "soon",
      action: () => showWcMessage("Lattice card added. Integration is pending."),
    },
    {
      key: "qr",
      logoKey: "qrbased",
      title: "QR-based",
      subtitle: "Use camera-based pairing and WalletConnect flows.",
      badge: "Live",
      state: "live",
      action: () => setScannerOpen(true),
    },
    {
      key: "import",
      logoKey: "seedimport",
      title: "Seed import",
      subtitle: "Current app already supports imported wallets on the auth flow.",
      badge: "Live",
      state: "live",
      action: () => showWcMessage("Seed import is available from the wallet unlock/create/import screen."),
    },
    {
      key: "sync",
      logoKey: "browsersync",
      title: "Browser sync",
      subtitle: "Prepared card for future multi-device sync experience.",
      badge: "Soon",
      state: "soon",
      action: () => showWcMessage("Browser sync card added. Sync backend is not implemented yet."),
    },
  ], []);

  function applyPresetToDraft(chainIdValue: string) {
    const chainId = Number(chainIdValue);
    if (!Number.isFinite(chainId) || chainId <= 0) return;
    const preset = findPresetByChainId(chainId);
    if (!preset) return;
    const presetNetwork = makeNetworkFromChainId(chainId);
    setDraft((prev) => ({
      ...prev,
      chainId: String(chainId),
      name: prev.name.trim() || preset.name,
      symbol: prev.symbol.trim() || preset.symbol,
      rpcUrl: prev.rpcUrl.trim() || preset.rpcUrl,
      explorerUrl: prev.explorerUrl.trim() || preset.explorerBaseUrl,
      logo: prev.logo || presetNetwork?.logo || "",
    }));
    setNetworkValidation({ status: "idle", message: `Known network detected: ${preset.name}. Review and save.` });
  }

  function handleDraftChainIdChange(value: string) {
    setDraft((prev) => ({ ...prev, chainId: value }));
    if (/^\d+$/.test(value.trim())) applyPresetToDraft(value.trim());
  }

  function handleUploadNetworkLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, logo: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  function handleRegistryFileUpload(event: React.ChangeEvent<HTMLInputElement>, kind: "network" | "token" | "dapp" | "wallet") {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (kind === "network") setRegistryDraft((prev) => ({ ...prev, networkPath: result }));
      if (kind === "token") setRegistryDraft((prev) => ({ ...prev, tokenPath: result }));
      if (kind === "dapp") setRegistryDraft((prev) => ({ ...prev, dappPath: result }));
      if (kind === "wallet") setRegistryDraft((prev) => ({ ...prev, walletPath: result }));
    };
    reader.readAsDataURL(file);
  }

  function showWcMessage(textValue: string) {
    setWcMessage(textValue);
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
    if (network.isCustom) upsertCustomNetwork(next);
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
        setNetworkValidation({ status: "ok", message: "RPC could not be confirmed in browser. You can still save and test this network manually." });
        return { chainId, remoteChainId: null };
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
    } catch {
      setNetworkValidation({ status: "ok", message: "RPC validation was blocked by the browser or RPC policy. Network can still be saved manually." });
      return { chainId, remoteChainId: null };
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
      logo: draft.logo || networks.find((item) => item.chainId === chainId)?.logo || makeNetworkFromChainId(chainId)?.logo || `${BASE}network-inri.png`,
      isCustom: true,
    });
    setDraft({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" });
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
      logo: item.logo || "",
    });
  }

  function handleDeleteCustomNetwork(item: NetworkItem) {
    removeCustomNetwork(item.key);
    if (Number(network.chainId) === Number(item.chainId)) handleSelectNetwork(getAllNetworks()[0]);
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

  async function handleScannedUri(value: string) {
    setScannerOpen(false);
    setWcUri(value);
    showWcMessage(tr(lang, "settings_wc_qr_detected"));
    setWcLoading(true);
    try {
      await pairWalletConnect(value.trim());
      setWcUri("");
      refreshSessions();
      showWcMessage(tr(lang, "settings_wc_pairing_started"));
    } catch (err: any) {
      console.error(err);
      setWcUri(value);
      showWcMessage(err?.message || tr(lang, "settings_wc_failed_connect"));
    } finally {
      setWcLoading(false);
    }
  }

  function handleSaveRegistry(kind: "network" | "token" | "dapp" | "wallet") {
    if (kind === "network") {
      const cleanKey = sanitizeAssetKey(registryDraft.networkKey);
      if (!cleanKey || !registryDraft.networkPath.trim()) return showWcMessage("Enter a network key and asset path.");
      updateAssetRegistryEntry("network", cleanKey, registryDraft.networkPath.trim(), cleanKey);
      setRegistryDraft((prev) => ({ ...prev, networkPath: "" }));
      setAssetVersion((v) => v + 1);
      return showWcMessage(`Saved network asset: ${cleanKey}`);
    }
    if (kind === "token") {
      const cleanKey = sanitizeAssetKey(registryDraft.tokenKey);
      if (!cleanKey || !registryDraft.tokenPath.trim()) return showWcMessage("Enter a token key and asset path.");
      updateAssetRegistryEntry("token", cleanKey, registryDraft.tokenPath.trim(), cleanKey);
      setRegistryDraft((prev) => ({ ...prev, tokenPath: "" }));
      setAssetVersion((v) => v + 1);
      return showWcMessage(`Saved token asset: ${cleanKey}`);
    }
    if (kind === "dapp") {
      const cleanKey = sanitizeAssetKey(registryDraft.dappKey);
      if (!cleanKey || !registryDraft.dappPath.trim()) return showWcMessage("Enter a dApp key and asset path.");
      updateAssetRegistryEntry("dapp", cleanKey, registryDraft.dappPath.trim(), cleanKey);
      setRegistryDraft((prev) => ({ ...prev, dappPath: "" }));
      setAssetVersion((v) => v + 1);
      return showWcMessage(`Saved dApp asset: ${cleanKey}`);
    }
    const cleanKey = sanitizeAssetKey(registryDraft.walletKey);
    if (!cleanKey || !registryDraft.walletPath.trim()) return showWcMessage("Enter a wallet key and asset path.");
    updateAssetRegistryEntry("wallet", cleanKey, registryDraft.walletPath.trim(), cleanKey);
    setRegistryDraft((prev) => ({ ...prev, walletPath: "" }));
    setAssetVersion((v) => v + 1);
    return showWcMessage(`Saved wallet asset: ${cleanKey}`);
  }

  return (
    <>
      <div style={{ display: "grid", gap: 18 }}>
        <PremiumPanel isLight={isLight}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: text }}>{t.settings}</div>
              <div style={{ marginTop: 8, color: muted, lineHeight: 1.6, maxWidth: 760 }}>{t.subtitle} Premium pass for desktop and mobile: cleaner spacing, stronger cards, better permissions and an admin-friendly logo registry.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 18, border: `1px solid ${border}`, background: isLight ? "#f8fbff" : "#0f1624" }}>
              <LogoImage src={avatar || undefined} alt="avatar" kind="dapp" label="Wallet" size={52} rounded={false} />
              <div>
                <div style={{ fontWeight: 800, color: text }}>{network.name}</div>
                <div style={{ color: muted, fontSize: 13 }}>Active network • Chain ID {network.chainId}</div>
              </div>
            </div>
          </div>
        </PremiumPanel>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          <PremiumPanel isLight={isLight}>
            <SectionHeader title="Appearance" subtitle="Unified desktop and mobile presentation." isLight={isLight} />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={labelStyle(isLight)}>{t.language}</div>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={inputStyle(isLight)}>
                <option value="en">English</option><option value="pt">Português</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="ru">Русский</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="tr">Türkçe</option>
              </select>
              <div style={labelStyle(isLight)}>{t.theme}</div>
              <select value={theme} onChange={(e) => setTheme(e.target.value as "dark" | "light")} style={inputStyle(isLight)}>
                <option value="dark">{t.dark}</option>
                <option value="light">{t.light}</option>
              </select>
            </div>
          </PremiumPanel>

          <PremiumPanel isLight={isLight}>
            <SectionHeader title="Profile" subtitle="Keep the wallet identity consistent everywhere." isLight={isLight} />
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <LogoImage src={avatar || undefined} alt="avatar" kind="dapp" label="Wallet" size={72} rounded={false} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ color: text, fontWeight: 800, marginBottom: 4 }}>{t.avatar}</div>
                <div style={{ color: muted, fontSize: 13, lineHeight: 1.55 }}>{t.avatarHint}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button onClick={() => fileRef.current?.click()} style={primaryButton}>{t.uploadAvatar}</button>
                  <button onClick={handleRemoveAvatar} style={secondaryButton(isLight)}>{t.removeAvatar}</button>
                </div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadAvatar} />
          </PremiumPanel>

          <PremiumPanel isLight={isLight}>
            <SectionHeader title={t.securityTitle} subtitle="Faster settings but still safer flows." isLight={isLight} />
            <div style={{ display: "grid", gap: 12 }}>
              <SwitchRow isLight={isLight} label={t.securityLockHidden} hint={t.securityLockHiddenHint} checked={securityState.lockOnHidden} onChange={(checked) => handleSecurityPatch({ lockOnHidden: checked })} />
              <SwitchRow isLight={isLight} label={t.securityRequirePassword} hint={t.securityRequirePasswordHint} checked={securityState.requirePasswordForSensitiveActions} onChange={(checked) => handleSecurityPatch({ requirePasswordForSensitiveActions: checked })} />
              <div>
                <div style={labelStyle(isLight)}>{t.securityAutolock}</div>
                <div style={{ color: muted, fontSize: 13, marginBottom: 8 }}>{t.securityAutolockHint}</div>
                <input type="number" min={0} max={240} value={securityState.autoLockMinutes} onChange={(e) => handleSecurityPatch({ autoLockMinutes: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })} style={inputStyle(isLight)} />
                <div style={{ color: muted, fontSize: 12, marginTop: 6 }}>{t.securityAutolockMinutes}</div>
              </div>
            </div>
          </PremiumPanel>
        </div>

        <PremiumPanel isLight={isLight}>
          <SectionHeader title="Wallet additions" subtitle="Grid-based wallet entry cards inspired by top wallets, ready for PC and mobile." isLight={isLight} />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
            {integrationCards.map((item) => (
              <button key={item.key} onClick={item.action} style={integrationCard(isLight, item.state === "live")}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <LogoImage
                      src={resolveWalletAsset({ key: item.logoKey || item.key, name: item.title, logo: item.logoPath })}
                      alt={item.title}
                      kind="wallet"
                      label={item.title}
                      symbol={item.title.slice(0,3).toUpperCase()}
                      size={44}
                      rounded={false}
                      style={{ borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#fff" : "#0b1018", padding: 6 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: text, letterSpacing: ".04em" }}>{item.title}</div>
                      <div style={{ color: muted, fontSize: 12, marginTop: 3 }}>Logo key: {item.logoKey || item.key}</div>
                    </div>
                  </div>
                  <span style={integrationBadge(isLight, item.state)}>{item.badge}</span>
                </div>
                <div style={{ color: muted, fontSize: 13, lineHeight: 1.55, marginTop: 12 }}>{item.subtitle}</div>
              </button>
            ))}
          </div>
        </PremiumPanel>

        <PremiumPanel isLight={isLight}>
          <SectionHeader title={t.network} subtitle="Searchable network center with cleaner cards and easier custom network editing." isLight={isLight} />
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.2fr .8fr" }}>
              <input value={networkQuery} onChange={(e) => setNetworkQuery(e.target.value)} placeholder="Search network, symbol or chain ID" style={inputStyle(isLight)} />
              <input value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder={t.rpcPlaceholder} style={inputStyle(isLight)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSaveRpc} style={primaryButton}>{t.saveRpc}</button>
            </div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
              {filteredNetworks.map((item) => {
                const active = Number(item.chainId) === Number(network.chainId);
                return (
                  <button key={`${item.key}-${item.chainId}`} onClick={() => handleSelectNetwork(item)} style={networkCard(isLight, active)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={34} />
                      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                        <div style={{ fontWeight: 800, color: text, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>Chain ID {item.chainId} • {item.symbol}{item.isCustom ? " • Custom" : ""}</div>
                      </div>
                      <span style={active ? statusPillActive : statusPillIdle(isLight)}>{active ? t.active : t.select}</span>
                    </div>
                    {item.isCustom ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={(e) => { e.stopPropagation(); handleEditCustomNetwork(item); }} style={secondaryButton(isLight)}>Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomNetwork(item); }} style={dangerButton}>Remove</button>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel isLight={isLight}>
          <SectionHeader title="Custom networks" subtitle="Preset-aware form with cleaner validation and image preview." isLight={isLight} />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Network name" style={inputStyle(isLight)} />
            <input value={draft.chainId} onChange={(e) => handleDraftChainIdChange(e.target.value)} onBlur={(e) => applyPresetToDraft(e.target.value)} placeholder="Chain ID" style={inputStyle(isLight)} />
            <input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} placeholder="Symbol" style={inputStyle(isLight)} />
            <input value={draft.rpcUrl} onChange={(e) => setDraft({ ...draft, rpcUrl: e.target.value })} placeholder="RPC URL" style={inputStyle(isLight)} />
            <input value={draft.explorerUrl} onChange={(e) => setDraft({ ...draft, explorerUrl: e.target.value })} placeholder="Explorer base URL" style={inputStyle(isLight)} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, border: `1px solid ${border}`, background: isLight ? "#f8fbff" : "#0f1624" }}>
              <LogoImage src={draft.logo || resolveNetworkAsset({ key: draft.name, name: draft.name || "Custom network", symbol: draft.symbol || "NET" })} alt="network logo" kind="network" label={draft.name || "Custom network"} symbol={draft.symbol || "NET"} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: text, fontWeight: 800, marginBottom: 4 }}>Network logo</div>
                <div style={{ color: muted, fontSize: 12 }}>Upload a file or paste a data URL / public file path.</div>
              </div>
              <button onClick={() => logoFileRef.current?.click()} style={secondaryButton(isLight)}>Upload</button>
              <input ref={logoFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadNetworkLogo} />
            </div>
          </div>
          <input value={draft.logo} onChange={(e) => setDraft({ ...draft, logo: e.target.value })} placeholder="Optional logo path, URL or data:image/..." style={{ ...inputStyle(isLight), marginTop: 12 }} />
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={handleAddOrUpdateCustomNetwork} style={primaryButton}>Save custom network</button>
            {networkValidation.message ? <span style={validationPill(isLight, networkValidation.status)}>{networkValidation.message}</span> : null}
          </div>
        </PremiumPanel>

        <PremiumPanel isLight={isLight}>
          <SectionHeader title="Connected sites & permissions" subtitle="Cleaner permission center with better revoke controls and clearer risk review." isLight={isLight} />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: 16 }}>
            <MetricCard isLight={isLight} label="Connected" value={String(permissionSummary.total)} />
            <MetricCard isLight={isLight} label="Browser" value={String(permissionSummary.browser)} />
            <MetricCard isLight={isLight} label="WalletConnect" value={String(permissionSummary.walletconnect)} />
            <MetricCard isLight={isLight} label="Methods" value={String(permissionSummary.methods)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ color: muted, fontSize: 13, lineHeight: 1.55 }}>Every approved site keeps its methods, accounts and networks visible here so the user can audit access quickly on desktop and mobile.</div>
            <button onClick={() => { revokeAllSitePermissions(); setPermissions(listSitePermissions()); showWcMessage("All site permissions revoked."); }} style={dangerButton}>Revoke all</button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {permissions.length ? permissions.map((item) => (
              <div key={item.id} style={permissionCard(isLight)}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, flex: 1 }}>
                    <LogoImage src={resolveDappAsset(item.icon, item.name)} alt={item.name} kind="dapp" label={item.name} size={42} rounded={false} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: text, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                      <div style={{ color: muted, fontSize: 13, wordBreak: "break-all" }}>{item.origin}</div>
                      <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Last used {new Date(item.lastUsedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={typePill(isLight, item.type === "walletconnect")}>{item.type === "walletconnect" ? "WalletConnect" : "Browser"}</span>
                    <button onClick={() => { revokeSitePermission(item.id); setPermissions(listSitePermissions()); showWcMessage(`Permission revoked: ${item.name}`); }} style={dangerButton}>Revoke</button>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 14 }}>
                  <PermissionGroup title="Accounts" values={item.accounts?.length ? item.accounts : ["No accounts saved"]} isLight={isLight} />
                  <PermissionGroup title="Networks" values={item.chains?.length ? item.chains.map((chain) => `Chain ${chain}`) : ["No chains saved"]} isLight={isLight} />
                  <PermissionGroup title="Methods" values={item.methods?.length ? item.methods : ["No methods saved"]} isLight={isLight} />
                </div>
              </div>
            )) : <EmptyState isLight={isLight} title="No connected sites yet" subtitle="When a dApp gets access, it will appear here with accounts, networks and methods." />}
          </div>
        </PremiumPanel>

        <PremiumPanel isLight={isLight}>
          <SectionHeader title="Asset registry" subtitle="Admin-friendly logo registry to map public files once and reflect them across the whole app." isLight={isLight} />
          <div style={{ color: muted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            Use plain keys like <strong style={{ color: text }}>celo</strong>, <strong style={{ color: text }}>iusd</strong> or <strong style={{ color: text }}>mydapp</strong>. The path can be a public file such as <strong style={{ color: text }}>network-celo.png</strong>, an absolute URL, or a data URL. After saving, desktop and mobile builds resolve the same asset automatically.
          </div>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            <RegistryEditor
              title="Networks"
              preview={resolveNetworkAsset({ key: registryDraft.networkKey, name: registryDraft.networkKey || "network", logo: registryDraft.networkPath || undefined })}
              previewLabel={registryDraft.networkKey || "network"}
              keyValue={registryDraft.networkKey}
              pathValue={registryDraft.networkPath}
              onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, networkKey: value }))}
              onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, networkPath: value }))}
              onUpload={() => registryFileRef.current?.click()}
              onSave={() => handleSaveRegistry("network")}
              isLight={isLight}
            />
            <RegistryEditor
              title="Tokens"
              preview={resolveTokenAsset({ symbol: registryDraft.tokenKey, name: registryDraft.tokenKey || "token", logo: registryDraft.tokenPath || undefined })}
              previewLabel={registryDraft.tokenKey || "token"}
              keyValue={registryDraft.tokenKey}
              pathValue={registryDraft.tokenPath}
              onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, tokenKey: value }))}
              onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, tokenPath: value }))}
              onUpload={() => registryFileRef.current?.click()}
              onSave={() => handleSaveRegistry("token")}
              isLight={isLight}
            />
            <RegistryEditor
              title="dApps"
              preview={resolveDappAsset(registryDraft.dappPath || undefined, registryDraft.dappKey || "dApp")}
              previewLabel={registryDraft.dappKey || "dApp"}
              keyValue={registryDraft.dappKey}
              pathValue={registryDraft.dappPath}
              onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, dappKey: value }))}
              onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, dappPath: value }))}
              onUpload={() => registryFileRef.current?.click()}
              onSave={() => handleSaveRegistry("dapp")}
              isLight={isLight}
            />
            <RegistryEditor
              title="Wallets"
              preview={resolveWalletAsset({ key: registryDraft.walletKey, name: registryDraft.walletKey || "wallet", logo: registryDraft.walletPath || undefined })}
              previewLabel={registryDraft.walletKey || "wallet"}
              keyValue={registryDraft.walletKey}
              pathValue={registryDraft.walletPath}
              onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, walletKey: value }))}
              onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, walletPath: value }))}
              onUpload={() => registryFileRef.current?.click()}
              onSave={() => handleSaveRegistry("wallet")}
              isLight={isLight}
            />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={secondaryButton(isLight)}>
              Upload image
              <input ref={registryFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                if (registryDraft.walletKey && !registryDraft.networkKey && !registryDraft.tokenKey && !registryDraft.dappKey) handleRegistryFileUpload(e, "wallet");
                else if (registryDraft.dappKey && !registryDraft.networkKey && !registryDraft.tokenKey) handleRegistryFileUpload(e, "dapp");
                else if (registryDraft.tokenKey && !registryDraft.networkKey) handleRegistryFileUpload(e, "token");
                else handleRegistryFileUpload(e, "network");
              }} />
            </label>
            <button onClick={() => { resetAssetRegistry(); setAssetVersion((v) => v + 1); showWcMessage("Asset registry reset to defaults."); }} style={dangerButton}>Reset registry</button>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 16 }}>
            <RegistryList title="Network keys" entries={Object.keys(registry.networks).slice(0, 16)} isLight={isLight} />
            <RegistryList title="Token keys" entries={Object.keys(registry.tokens).slice(0, 16)} isLight={isLight} />
            <RegistryList title="dApp keys" entries={Object.keys(registry.dapps).slice(0, 16)} isLight={isLight} />
            <RegistryList title="Wallet keys" entries={Object.keys(registry.wallets || {}).slice(0, 16)} isLight={isLight} />
          </div>
        </PremiumPanel>

        <PremiumPanel isLight={isLight} ref={walletConnectRef}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <LogoImage src={resolveDappAsset(undefined, "walletconnect")} alt="WalletConnect" kind="dapp" label="WalletConnect" size={42} rounded={false} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <SectionHeader title={t.wcTitle} subtitle={`${t.wcHint} Save the WalletConnect brand as brand-walletconnect.png in public or map the key walletconnect in the asset registry.`} isLight={isLight} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr auto auto auto" }}>
            <input value={wcUri} onChange={(e) => setWcUri(e.target.value)} placeholder={t.wcConnectUri || "Paste WalletConnect URI"} style={inputStyle(isLight)} />
            <button onClick={() => setScannerOpen(true)} style={secondaryButton(isLight)}>{t.wcScanQr}</button>
            <button onClick={refreshSessions} style={secondaryButton(isLight)}>{t.wcRefresh}</button>
            <button onClick={handleConnectWc} style={primaryButton}>{wcLoading ? t.wcConnecting : "Connect"}</button>
          </div>
          {wcMessage ? <div style={{ marginTop: 12, color: text, fontWeight: 700 }}>{wcMessage}</div> : null}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, color: text }}>{t.wcActiveSessions}</div>
            <button onClick={handleDisconnectAll} style={dangerButton}>{t.wcDisconnectAll}</button>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {wcSessions.length ? wcSessions.map((session: any) => (
              <div key={session.topic} style={permissionCard(isLight)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <LogoImage
                      src={resolveDappAsset(session.peer?.metadata?.icons?.[0], session.peer?.metadata?.name || "walletconnect")}
                      alt={session.peer?.metadata?.name || "WalletConnect session"}
                      kind="dapp"
                      label={session.peer?.metadata?.name || "WalletConnect"}
                      size={40}
                      rounded={false}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: text, fontWeight: 800 }}>{session.peer?.metadata?.name || "WalletConnect session"}</div>
                      <div style={{ color: muted, fontSize: 13, wordBreak: "break-all" }}>{session.peer?.metadata?.url || session.topic}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDisconnectSession(session.topic)} style={dangerButton}>{t.wcDisconnect}</button>
                </div>
              </div>
            )) : <EmptyState isLight={isLight} title={t.wcNoSessions} subtitle="Pair a WalletConnect session from desktop or mobile and it will appear here." />}
          </div>
        </PremiumPanel>
      </div>

      {scannerOpen ? <WalletConnectQrScanner onClose={() => setScannerOpen(false)} onScanned={handleScannedUri} /> : null}
    </>
  );
}

type PanelProps = React.PropsWithChildren<{ isLight: boolean }> & { ref?: React.Ref<HTMLDivElement> };
const PremiumPanel = React.forwardRef<HTMLDivElement, React.PropsWithChildren<{ isLight: boolean }>>(function PremiumPanel({ isLight, children }, ref) {
  return (
    <div
      ref={ref}
      style={{
        background: isLight ? "rgba(255,255,255,.96)" : "rgba(17,23,34,.96)",
        border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
        borderRadius: 24,
        padding: 20,
        boxShadow: isLight ? "0 20px 60px rgba(20,30,50,.10)" : "0 18px 50px rgba(0,0,0,.22)",
      }}
    >
      {children}
    </div>
  );
});

function SectionHeader({ title, subtitle, isLight }: { title: string; subtitle: string; isLight: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{title}</div>
      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function MetricCard({ label, value, isLight }: { label: string; value: string; isLight: boolean }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 14 }}>
      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ marginTop: 8, color: isLight ? "#10131a" : "#ffffff", fontWeight: 900, fontSize: 24 }}>{value}</div>
    </div>
  );
}

function PermissionGroup({ title, values, isLight }: { title: string; values: string[]; isLight: boolean }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 12 }}>
      <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {values.map((value) => <span key={`${title}-${value}`} style={chipStyle(isLight)}>{value}</span>)}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, isLight }: { title: string; subtitle: string; isLight: boolean }) {
  return (
    <div style={{ padding: 18, borderRadius: 18, border: `1px dashed ${isLight ? "#cad6ea" : "#31425d"}`, color: isLight ? "#5b6578" : "#97a0b3", background: isLight ? "#f8fbff" : "#0f1624" }}>
      <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>{subtitle}</div>
    </div>
  );
}

function SwitchRow({ isLight, label, hint, checked, onChange }: { isLight: boolean; label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", cursor: "pointer" }}>
      <div>
        <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800 }}>{label}</div>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginTop: 4 }}>{hint}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function RegistryEditor({ title, preview, previewLabel, keyValue, pathValue, onKeyChange, onPathChange, onUpload, onSave, isLight }: {
  title: string;
  preview: string;
  previewLabel: string;
  keyValue: string;
  pathValue: string;
  onKeyChange: (value: string) => void;
  onPathChange: (value: string) => void;
  onUpload: () => void;
  onSave: () => void;
  isLight: boolean;
}) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <LogoImage src={preview} alt={previewLabel} kind="dapp" label={previewLabel} size={42} rounded={false} />
        <div>
          <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800 }}>{title}</div>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12 }}>Map once, reuse everywhere.</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <input value={keyValue} onChange={(e) => onKeyChange(e.target.value)} placeholder={`${title} key`} style={inputStyle(isLight)} />
        <input value={pathValue} onChange={(e) => onPathChange(e.target.value)} placeholder="public file, URL or data:image/..." style={inputStyle(isLight)} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onUpload} style={secondaryButton(isLight)}>Upload</button>
          <button onClick={onSave} style={primaryButton}>Save</button>
        </div>
      </div>
    </div>
  );
}

function RegistryList({ title, entries, isLight }: { title: string; entries: string[]; isLight: boolean }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 14 }}>
      <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {entries.length ? entries.map((item) => <span key={item} style={chipStyle(isLight)}>{item}</span>) : <span style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>No entries</span>}
      </div>
    </div>
  );
}

function labelStyle(isLight: boolean): React.CSSProperties {
  return { color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, fontSize: 13 };
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    borderRadius: 16,
    border: `1px solid ${isLight ? "#d7e0ee" : "#2b3950"}`,
    background: isLight ? "#f7fafe" : "#0d1420",
    color: isLight ? "#10131a" : "#fff",
    outline: "none",
    padding: "12px 14px",
  };
}

const primaryButton: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 14,
  border: "none",
  background: "#3f7cff",
  color: "#fff",
  fontWeight: 800,
  padding: "0 16px",
  cursor: "pointer",
};

function secondaryButton(isLight: boolean): React.CSSProperties {
  return {
    minHeight: 44,
    borderRadius: 14,
    border: `1px solid ${isLight ? "#d3dceb" : "#2c3950"}`,
    background: isLight ? "#ffffff" : "#12182a",
    color: isLight ? "#10131a" : "#ffffff",
    fontWeight: 800,
    padding: "0 16px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

const dangerButton: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 14,
  border: "1px solid rgba(255,107,107,.32)",
  background: "rgba(255,107,107,.10)",
  color: "#ff7e7e",
  fontWeight: 800,
  padding: "0 16px",
  cursor: "pointer",
};

function networkCard(isLight: boolean, active: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    borderRadius: 18,
    border: active ? "1px solid rgba(63,124,255,.36)" : `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
    background: active ? (isLight ? "#eef4ff" : "#162138") : (isLight ? "#f8fbff" : "#0f1624"),
    padding: 14,
    cursor: "pointer",
  };
}

function permissionCard(isLight: boolean): React.CSSProperties {
  return {
    borderRadius: 20,
    border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
    background: isLight ? "#f8fbff" : "#0f1624",
    padding: 16,
  };
}

function integrationCard(isLight: boolean, live: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    borderRadius: 20,
    border: `1px solid ${live ? "rgba(63,124,255,.34)" : isLight ? "#dbe2f0" : "#273042"}`,
    background: live ? (isLight ? "#eef4ff" : "#162138") : (isLight ? "#f8fbff" : "#0f1624"),
    padding: 16,
    cursor: "pointer",
    minHeight: 132,
  };
}

function integrationBadge(isLight: boolean, state: "live" | "soon"): React.CSSProperties {
  return state === "live"
    ? { padding: "6px 10px", borderRadius: 999, background: "rgba(63,124,255,.14)", color: "#3f7cff", fontWeight: 800, fontSize: 12 }
    : { padding: "6px 10px", borderRadius: 999, background: isLight ? "#fff7eb" : "rgba(255,176,32,.08)", color: "#ffb020", fontWeight: 800, fontSize: 12 };
}

const statusPillActive: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "rgba(63,124,255,.14)", color: "#3f7cff", fontWeight: 800, fontSize: 12 };
function statusPillIdle(isLight: boolean): React.CSSProperties { return { padding: "6px 10px", borderRadius: 999, background: isLight ? "#edf2f8" : "#172133", color: isLight ? "#5b6578" : "#97a0b3", fontWeight: 800, fontSize: 12 }; }
function typePill(isLight: boolean, walletconnect: boolean): React.CSSProperties { return walletconnect ? statusPillActive : statusPillIdle(isLight); }
function chipStyle(isLight: boolean): React.CSSProperties { return { padding: "6px 10px", borderRadius: 999, background: isLight ? "#edf2f8" : "#172133", color: isLight ? "#334155" : "#c8d1e0", fontSize: 12, fontWeight: 700 }; }
function validationPill(isLight: boolean, status: "idle" | "checking" | "ok" | "error"): React.CSSProperties {
  const map = {
    idle: { bg: isLight ? "#edf2f8" : "#172133", color: isLight ? "#334155" : "#c8d1e0" },
    checking: { bg: isLight ? "#fff7eb" : "rgba(255,176,32,.08)", color: "#ffb020" },
    ok: { bg: isLight ? "#ecfdf3" : "rgba(38,182,109,.10)", color: "#26b66d" },
    error: { bg: isLight ? "#fff1f1" : "rgba(255,107,107,.10)", color: "#ff7e7e" },
  }[status];
  return { padding: "8px 12px", borderRadius: 999, background: map.bg, color: map.color, fontSize: 12, fontWeight: 800 };
}
