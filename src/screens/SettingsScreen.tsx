import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSecuritySettings, saveSecuritySettings, type SecuritySettings } from "../lib/security";
import {
  getAllNetworks,
  getStoredNetwork,
  saveStoredNetwork,
  upsertCustomNetwork,
  removeCustomNetwork,
  findPresetByChainId,
  type NetworkItem,
} from "../lib/network";
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
  suggestPublicAssetPath,
  listRegistryEntries,
} from "../lib/assets";

const AVATAR_KEY = "wallet_avatar";

type MorePage = "settings" | "walletconnect" | "chains" | "wallets" | "connected" | "assets";

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

const emptyDraft = (): CustomNetworkDraft => ({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" });

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

  const [page, setPage] = useState<MorePage>("settings");
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [avatar, setAvatar] = useState<string>(localStorage.getItem(AVATAR_KEY) || "");
  const [securityState, setSecurityState] = useState<SecuritySettings>(security);
  const [permissions, setPermissions] = useState<SitePermission[]>([]);
  const [wcUri, setWcUri] = useState("");
  const [wcSessions, setWcSessions] = useState<any[]>([]);
  const [wcLoading, setWcLoading] = useState(false);
  const [wcMessage, setWcMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [networkQuery, setNetworkQuery] = useState("");
  const [draft, setDraft] = useState<CustomNetworkDraft>(emptyDraft());
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
  const [assetVersion, setAssetVersion] = useState(0);
  const [networkValidation, setNetworkValidation] = useState<{ status: "idle" | "checking" | "ok" | "error"; message: string }>({ status: "idle", message: "" });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const registryFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSecurityState(security);
    setPermissions(listSitePermissions());
    setNetwork(getStoredNetwork());
    refreshSessions();
  }, [security]);

  useEffect(() => {
    const sync = () => {
      setNetwork(getStoredNetwork());
      setPermissions(listSitePermissions());
      setAssetVersion((v) => v + 1);
    };
    const openWalletConnect = () => setPage("walletconnect");
    window.addEventListener("wallet-site-permissions-updated", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    window.addEventListener("wallet-assets-updated", sync as EventListener);
    window.addEventListener("wallet-open-wc", openWalletConnect as EventListener);
    return () => {
      window.removeEventListener("wallet-site-permissions-updated", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
      window.removeEventListener("wallet-assets-updated", sync as EventListener);
      window.removeEventListener("wallet-open-wc", openWalletConnect as EventListener);
    };
  }, []);

  const networks = useMemo(() => getAllNetworks(), [network.chainId, assetVersion]);
  const customNetworks = useMemo(() => networks.filter((item) => item.isCustom), [networks]);
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

  const registryEntries = useMemo(() => ({
    network: listRegistryEntries("network").slice(0, 8),
    token: listRegistryEntries("token").slice(0, 8),
    dapp: listRegistryEntries("dapp").slice(0, 8),
    wallet: listRegistryEntries("wallet").slice(0, 8),
  }), [assetVersion]);

  const moduleCards = useMemo(() => [
    { key: "walletconnect" as const, title: "WalletConnect", subtitle: "URI pairing, QR scanner and active sessions." },
    { key: "chains" as const, title: "Networks", subtitle: "Active network, custom RPC setup and chain management." },
    { key: "connected" as const, title: "Connected sites", subtitle: "Permissions center with accounts, chains and methods." },
    { key: "wallets" as const, title: "Wallet additions", subtitle: "Hardware and import options kept off the main settings page." },
    { key: "assets" as const, title: "Asset registry", subtitle: "Central logo mapping from the public folder or URLs." },
  ], []);

  const walletCards = useMemo(() => [
    { key: "ledger", title: "Ledger", subtitle: "Premium hardware wallet card ready for future native integration.", badge: "Soon", live: false },
    { key: "trezor", title: "Trezor", subtitle: "Clean entry point for another major hardware wallet flow.", badge: "Soon", live: false },
    { key: "lattice", title: "Lattice", subtitle: "Keeps the layout ready for power-user wallet expansion.", badge: "Soon", live: false },
    { key: "qrbased", title: "QR-based", subtitle: "Best current option for camera-driven connect flows.", badge: "Live", live: true },
    { key: "seedimport", title: "Seed import", subtitle: "Already supported in the unlock, create and import flow.", badge: "Live", live: true },
    { key: "browsersync", title: "Browser sync", subtitle: "Reserved slot for future multi-device wallet sync.", badge: "Soon", live: false },
  ], []);

  function showWcMessage(text: string) {
    setWcMessage(text);
    window.setTimeout(() => setWcMessage(""), 2600);
  }

  async function refreshSessions() {
    try {
      setWcSessions(await getActiveSessions());
    } catch {
      setWcSessions([]);
    }
  }

  async function handleConnectWc() {
    if (!wcUri.trim()) {
      showWcMessage("Paste a WalletConnect URI first.");
      return;
    }
    try {
      setWcLoading(true);
      await pairWalletConnect(wcUri.trim());
      setWcUri("");
      showWcMessage("WalletConnect pairing started.");
      refreshSessions();
    } catch (err: any) {
      showWcMessage(err?.message || "Failed to start WalletConnect pairing.");
    } finally {
      setWcLoading(false);
    }
  }

  async function handleDisconnectSession(topic: string) {
    try {
      await disconnectSession(topic);
      refreshSessions();
    } catch {
      showWcMessage("Failed to disconnect session.");
    }
  }

  async function handleDisconnectAll() {
    try {
      await disconnectAllSessions();
      refreshSessions();
    } catch {
      showWcMessage("Failed to disconnect all sessions.");
    }
  }

  function handleScannedUri(uri: string) {
    setWcUri(uri);
    setScannerOpen(false);
    setPage("walletconnect");
    window.setTimeout(() => handleConnectWc(), 120);
  }

  function updateSecurity(patch: Partial<SecuritySettings>) {
    const next = { ...securityState, ...patch };
    setSecurityState(next);
    saveSecuritySettings(next);
  }

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setAvatar(value);
      localStorage.setItem(AVATAR_KEY, value);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleNetworkLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((prev) => ({ ...prev, logo: String(reader.result || "") }));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleRegistryUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      if (registryDraft.networkKey) setRegistryDraft((prev) => ({ ...prev, networkPath: value }));
      else if (registryDraft.tokenKey) setRegistryDraft((prev) => ({ ...prev, tokenPath: value }));
      else if (registryDraft.dappKey) setRegistryDraft((prev) => ({ ...prev, dappPath: value }));
      else setRegistryDraft((prev) => ({ ...prev, walletPath: value }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function validateNetworkRpc(rpcUrl: string, chainIdValue: number) {
    if (!rpcUrl || !chainIdValue) return;
    try {
      setNetworkValidation({ status: "checking", message: "Checking RPC…" });
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const json = await response.json();
      const rpcChainId = parseInt(String(json?.result || "0"), 16);
      if (rpcChainId === Number(chainIdValue)) setNetworkValidation({ status: "ok", message: `RPC responded with chain ${rpcChainId}.` });
      else setNetworkValidation({ status: "error", message: `RPC returned chain ${rpcChainId}, expected ${chainIdValue}.` });
    } catch {
      setNetworkValidation({ status: "error", message: "Could not validate the RPC endpoint." });
    }
  }

  async function saveCustomChain() {
    const chainId = Number(draft.chainId);
    if (!draft.name.trim() || !chainId || !draft.rpcUrl.trim()) {
      setNetworkValidation({ status: "error", message: "Name, chain ID and RPC URL are required." });
      return;
    }
    const preset = findPresetByChainId(chainId);
    const key = sanitizeAssetKey(draft.name || preset?.key || draft.symbol || `chain${chainId}`) || `chain${chainId}`;
    const explorerBase = String(draft.explorerUrl || "").replace(/\/$/, "");
    const next = upsertCustomNetwork({
      key,
      name: draft.name.trim(),
      chainId,
      symbol: draft.symbol.trim() || preset?.symbol || "ETH",
      rpcUrl: draft.rpcUrl.trim(),
      explorerAddressUrl: explorerBase ? `${explorerBase}/address/` : "",
      explorerTxUrl: explorerBase ? `${explorerBase}/tx/` : "",
      logo: draft.logo || resolveNetworkAsset({ key, name: draft.name, symbol: draft.symbol || preset?.symbol || "ETH" }),
      isCustom: true,
    });
    setDraft(emptyDraft());
    setNetwork(next);
    setNetworkValidation({ status: "ok", message: `Saved ${next.name}.` });
  }

  function openNetworkEditor(item: NetworkItem) {
    setDraft({
      name: item.name,
      chainId: String(item.chainId),
      symbol: item.symbol,
      rpcUrl: item.rpcUrl,
      explorerUrl: item.explorerAddressUrl ? item.explorerAddressUrl.replace(/\/address\/$/, "") : "",
      logo: item.logo,
    });
    setPage("chains");
  }

  function saveRegistry(kind: "network" | "token" | "dapp" | "wallet") {
    if (kind === "network") updateAssetRegistryEntry("network", registryDraft.networkKey, registryDraft.networkPath);
    if (kind === "token") updateAssetRegistryEntry("token", registryDraft.tokenKey, registryDraft.tokenPath);
    if (kind === "dapp") updateAssetRegistryEntry("dapp", registryDraft.dappKey, registryDraft.dappPath);
    if (kind === "wallet") updateAssetRegistryEntry("wallet", registryDraft.walletKey, registryDraft.walletPath);
    setAssetVersion((v) => v + 1);
  }

  return (
    <>
      <div style={{ display: "grid", gap: 16, paddingBottom: 10 }}>
        <Hero isLight={isLight} title={pageTitle(page)} subtitle={pageSubtitle(page)}>
          {page !== "settings" ? <button onClick={() => setPage("settings")} style={secondaryButton(isLight)}>Back to Settings</button> : null}
        </Hero>

        {page === "settings" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Panel isLight={isLight}>
              <SectionHeader title="Wallet profile" subtitle="Keep this page focused on the essentials. Advanced modules open on their own pages." isLight={isLight} />
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <LogoImage src={avatar || resolveDappAsset(undefined, "INRI")} alt="Wallet avatar" kind="dapp" label="Wallet" size={72} rounded={false} />
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ color: muted, fontSize: 13 }}>This avatar appears across the wallet on desktop and mobile.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => fileRef.current?.click()} style={secondaryButton(isLight)}>Upload avatar</button>
                    <button onClick={() => { setAvatar(""); localStorage.removeItem(AVATAR_KEY); }} style={dangerButton}>Remove</button>
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </Panel>

            <Panel isLight={isLight}>
              <SectionHeader title="Preferences" subtitle="Quick controls stay here. WalletConnect, Networks, Connected sites, Wallet additions and Asset registry open separately." isLight={isLight} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                <Field label="Theme">
                  <select value={theme} onChange={(e) => setTheme(e.target.value as "dark" | "light")} style={inputStyle(isLight)}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </Field>
                <Field label="Language">
                  <select value={lang} onChange={(e) => setLang(e.target.value)} style={inputStyle(isLight)}>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                    <option value="es">Español</option>
                  </select>
                </Field>
              </div>
            </Panel>

            <Panel isLight={isLight}>
              <SectionHeader title="Security" subtitle="Security stays visible here without mixing in connection and network management." isLight={isLight} />
              <div style={{ display: "grid", gap: 10 }}>
                <ToggleCard isLight={isLight} label="Auto-lock" hint="Automatically lock the wallet after inactivity." checked={securityState.autoLockEnabled} onChange={(checked) => updateSecurity({ autoLockEnabled: checked })} />
                <Field label="Auto-lock minutes">
                  <input type="number" min={1} max={120} value={securityState.autoLockMinutes} onChange={(e) => updateSecurity({ autoLockMinutes: Math.max(1, Number(e.target.value) || 1) })} style={inputStyle(isLight)} />
                </Field>
                <ToggleCard isLight={isLight} label="Lock hidden tab" hint="Lock the wallet when the app goes into the background." checked={securityState.lockOnHidden} onChange={(checked) => updateSecurity({ lockOnHidden: checked })} />
                <ToggleCard isLight={isLight} label="Require password for sensitive actions" hint="Adds an extra confirmation before exporting or revealing private data." checked={securityState.requirePasswordForSensitiveActions} onChange={(checked) => updateSecurity({ requirePasswordForSensitiveActions: checked })} />
              </div>
            </Panel>

            <Panel isLight={isLight}>
              <SectionHeader title="Advanced modules" subtitle="These moved out of Settings to keep the experience cleaner." isLight={isLight} />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                {moduleCards.map((item) => (
                  <button key={item.key} onClick={() => setPage(item.key)} style={miniNavCard(isLight)}>
                    <div style={{ color: text, fontWeight: 800 }}>{item.title}</div>
                    <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{item.subtitle}</div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {page === "walletconnect" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Panel isLight={isLight}>
              <SectionHeader title="WalletConnect" subtitle="A dedicated page for pairing, scanning and managing active sessions." isLight={isLight} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                <MetricCard isLight={isLight} label="Active sessions" value={String(wcSessions.length)} />
                <MetricCard isLight={isLight} label="Permission links" value={String(permissionSummary.walletconnect)} />
                <MetricCard isLight={isLight} label="Brand key" value="walletconnect" />
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1.4fr repeat(3,minmax(120px,1fr))", marginTop: 16 }}>
                <input value={wcUri} onChange={(e) => setWcUri(e.target.value)} placeholder="Paste WalletConnect URI" style={inputStyle(isLight)} />
                <button onClick={() => setScannerOpen(true)} style={secondaryButton(isLight)}>Scan QR</button>
                <button onClick={refreshSessions} style={secondaryButton(isLight)}>Refresh</button>
                <button onClick={handleConnectWc} style={primaryButton}>{wcLoading ? "Connecting…" : "Connect"}</button>
              </div>
              {wcMessage ? <div style={{ marginTop: 12, color: text, fontWeight: 700 }}>{wcMessage}</div> : null}
            </Panel>

            <Panel isLight={isLight}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <SectionHeader title="Active sessions" subtitle="Each dApp session is separated here instead of cluttering the main settings page." isLight={isLight} />
                <button onClick={handleDisconnectAll} style={dangerButton}>Disconnect all</button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {wcSessions.length ? wcSessions.map((session: any) => (
                  <div key={session.topic} style={itemCard(isLight)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                        <LogoImage src={resolveDappAsset(session.peer?.metadata?.icons?.[0], session.peer?.metadata?.name || "walletconnect")} alt={session.peer?.metadata?.name || "WalletConnect"} kind="dapp" label={session.peer?.metadata?.name || "WalletConnect"} size={42} rounded={false} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: text, fontWeight: 800 }}>{session.peer?.metadata?.name || "WalletConnect session"}</div>
                          <div style={{ color: muted, fontSize: 13, wordBreak: "break-all" }}>{session.peer?.metadata?.url || session.topic}</div>
                          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Topic: {String(session.topic || "").slice(0, 20)}…</div>
                        </div>
                      </div>
                      <button onClick={() => handleDisconnectSession(session.topic)} style={dangerButton}>Disconnect</button>
                    </div>
                  </div>
                )) : <EmptyState isLight={isLight} title="No WalletConnect sessions yet" subtitle="Pair from mobile or desktop and the session will appear here." />}
              </div>
            </Panel>
          </div>
        ) : null}

        {page === "chains" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Panel isLight={isLight}>
              <SectionHeader title="Chains" subtitle="A dedicated network manager with active network, search and custom chain editing." isLight={isLight} />
              <div style={itemCard(isLight)}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} size={46} />
                  <div>
                    <div style={{ color: text, fontWeight: 900, fontSize: 18 }}>{network.name}</div>
                    <div style={{ color: muted, fontSize: 13 }}>Chain {network.chainId} · {network.symbol}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <input value={networkQuery} onChange={(e) => setNetworkQuery(e.target.value)} placeholder="Search networks by name, symbol or chain ID" style={inputStyle(isLight)} />
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                  {filteredNetworks.slice(0, 18).map((item) => (
                    <button key={`${item.key}-${item.chainId}`} onClick={() => { saveStoredNetwork(item); setNetwork(item); }} style={networkCard(isLight, item.chainId === network.chainId)}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} size={38} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ color: item.chainId === network.chainId ? "#ffffff" : text, fontWeight: 800 }}>{item.name}</div>
                          <div style={{ color: item.chainId === network.chainId ? "rgba(255,255,255,.76)" : muted, fontSize: 12 }}>Chain {item.chainId} · {item.symbol}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel isLight={isLight}>
              <SectionHeader title="Custom chains" subtitle="Add or edit your own RPCs, explorers and chain logos here instead of inside the main settings page." isLight={isLight} />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Network name" style={inputStyle(isLight)} />
                <input value={draft.chainId} onChange={(e) => setDraft((prev) => ({ ...prev, chainId: e.target.value }))} placeholder="Chain ID" style={inputStyle(isLight)} />
                <input value={draft.symbol} onChange={(e) => setDraft((prev) => ({ ...prev, symbol: e.target.value }))} placeholder="Symbol" style={inputStyle(isLight)} />
                <input value={draft.rpcUrl} onChange={(e) => setDraft((prev) => ({ ...prev, rpcUrl: e.target.value }))} placeholder="RPC URL" style={inputStyle(isLight)} />
                <input value={draft.explorerUrl} onChange={(e) => setDraft((prev) => ({ ...prev, explorerUrl: e.target.value }))} placeholder="Explorer base URL" style={inputStyle(isLight)} />
                <input value={draft.logo} onChange={(e) => setDraft((prev) => ({ ...prev, logo: e.target.value }))} placeholder="Logo path, URL or data:image/..." style={inputStyle(isLight)} />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => logoFileRef.current?.click()} style={secondaryButton(isLight)}>Upload logo</button>
                <button onClick={() => validateNetworkRpc(draft.rpcUrl.trim(), Number(draft.chainId))} style={secondaryButton(isLight)}>Validate RPC</button>
                <button onClick={saveCustomChain} style={primaryButton}>Save chain</button>
                <button onClick={() => { setDraft(emptyDraft()); setNetworkValidation({ status: "idle", message: "" }); }} style={secondaryButton(isLight)}>Clear</button>
              </div>
              <input ref={logoFileRef} type="file" accept="image/*" hidden onChange={handleNetworkLogoUpload} />
              {networkValidation.message ? <div style={{ marginTop: 12, color: networkValidation.status === "error" ? "#ef4444" : text, fontWeight: 700 }}>{networkValidation.message}</div> : null}
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {customNetworks.length ? customNetworks.map((item) => (
                  <div key={`${item.key}-${item.chainId}`} style={itemCard(isLight)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} size={40} />
                        <div>
                          <div style={{ color: text, fontWeight: 800 }}>{item.name}</div>
                          <div style={{ color: muted, fontSize: 12 }}>Chain {item.chainId} · {item.rpcUrl}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => openNetworkEditor(item)} style={secondaryButton(isLight)}>Edit</button>
                        <button onClick={() => removeCustomNetwork(item.chainId)} style={dangerButton}>Remove</button>
                      </div>
                    </div>
                  </div>
                )) : <EmptyState isLight={isLight} title="No custom chains yet" subtitle="Add your own RPC networks here and keep the main settings screen simple." />}
              </div>
            </Panel>
          </div>
        ) : null}

        {page === "wallets" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Panel isLight={isLight}>
              <SectionHeader title="Wallet additions" subtitle="A separate page for hardware and import options, similar to major wallets." isLight={isLight} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                {walletCards.map((item) => (
                  <button key={item.key} onClick={() => item.key === "qrbased" ? setScannerOpen(true) : showWcMessage(`${item.title} UI card is ready. Native integration can be connected later.`)} style={hubCardStyle(isLight)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <LogoImage src={resolveWalletAsset(item.key)} alt={item.title} kind="wallet" label={item.title} size={42} rounded={false} />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ color: text, fontWeight: 900 }}>{item.title}</div>
                        <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{item.subtitle}</div>
                      </div>
                    </div>
                    <span style={pill(isLight, item.live)}>{item.badge}</span>
                  </button>
                ))}
              </div>
              {wcMessage ? <div style={{ marginTop: 12, color: text, fontWeight: 700 }}>{wcMessage}</div> : null}
            </Panel>
          </div>
        ) : null}

        {page === "connected" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Panel isLight={isLight}>
              <SectionHeader title="Connected sites" subtitle="A cleaner permissions center with separate cards for origins, accounts, chains and methods." isLight={isLight} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                <MetricCard isLight={isLight} label="Total" value={String(permissionSummary.total)} />
                <MetricCard isLight={isLight} label="Browser" value={String(permissionSummary.browser)} />
                <MetricCard isLight={isLight} label="WalletConnect" value={String(permissionSummary.walletconnect)} />
                <MetricCard isLight={isLight} label="Methods" value={String(permissionSummary.methods)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={() => { revokeAllSitePermissions(); setPermissions(listSitePermissions()); }} style={dangerButton}>Revoke all</button>
              </div>
            </Panel>
            <Panel isLight={isLight}>
              <div style={{ display: "grid", gap: 10 }}>
                {permissions.length ? permissions.map((item) => (
                  <div key={item.id} style={itemCard(isLight)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                        <LogoImage src={resolveDappAsset(item.icon, item.name || item.origin)} alt={item.name || item.origin} kind="dapp" label={item.name || item.origin} size={44} rounded={false} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ color: text, fontWeight: 800 }}>{item.name || item.origin}</div>
                            <span style={pill(isLight, item.type === "walletconnect")}>{item.type === "walletconnect" ? "WalletConnect" : "Browser"}</span>
                          </div>
                          <div style={{ color: muted, fontSize: 13, wordBreak: "break-all" }}>{item.origin}</div>
                        </div>
                      </div>
                      <button onClick={() => { revokeSitePermission(item.id); setPermissions(listSitePermissions()); }} style={dangerButton}>Revoke</button>
                    </div>
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: 14 }}>
                      <InfoGroup isLight={isLight} title="Accounts" values={item.accounts?.length ? item.accounts : ["No accounts"]} />
                      <InfoGroup isLight={isLight} title="Chains" values={item.chains?.length ? item.chains.map((chain) => `Chain ${chain}`) : ["No chains"]} />
                      <InfoGroup isLight={isLight} title="Methods" values={item.methods?.length ? item.methods : ["No methods"]} />
                    </div>
                  </div>
                )) : <EmptyState isLight={isLight} title="No connected sites yet" subtitle="Sites and dApps you approve will appear here in a cleaner permissions center." />}
              </div>
            </Panel>
          </div>
        ) : null}

        {page === "assets" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Panel isLight={isLight}>
              <SectionHeader title="Asset registry" subtitle="Map one logo once and reuse it across desktop, mobile, WalletConnect, chains and tokens." isLight={isLight} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                <RegistryEditor
                  isLight={isLight}
                  title="Network logos"
                  preview={resolveNetworkAsset({ key: registryDraft.networkKey || "inri", name: registryDraft.networkKey || "INRI", symbol: "ETH", logo: registryDraft.networkPath })}
                  keyValue={registryDraft.networkKey}
                  pathValue={registryDraft.networkPath}
                  entries={registryEntries.network}
                  suggestedPath={registryDraft.networkKey ? suggestPublicAssetPath("network", registryDraft.networkKey) : ""}
                  onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, networkKey: value }))}
                  onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, networkPath: value }))}
                  onUseSuggested={() => setRegistryDraft((prev) => ({ ...prev, networkPath: suggestPublicAssetPath("network", prev.networkKey) }))}
                  onUpload={() => registryFileRef.current?.click()}
                  onSave={() => saveRegistry("network")}
                />
                <RegistryEditor
                  isLight={isLight}
                  title="Token logos"
                  preview={resolveTokenAsset({ symbol: registryDraft.tokenKey || "inri", name: registryDraft.tokenKey || "INRI", logo: registryDraft.tokenPath })}
                  keyValue={registryDraft.tokenKey}
                  pathValue={registryDraft.tokenPath}
                  entries={registryEntries.token}
                  suggestedPath={registryDraft.tokenKey ? suggestPublicAssetPath("token", registryDraft.tokenKey) : ""}
                  onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, tokenKey: value }))}
                  onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, tokenPath: value }))}
                  onUseSuggested={() => setRegistryDraft((prev) => ({ ...prev, tokenPath: suggestPublicAssetPath("token", prev.tokenKey) }))}
                  onUpload={() => registryFileRef.current?.click()}
                  onSave={() => saveRegistry("token")}
                />
                <RegistryEditor
                  isLight={isLight}
                  title="dApp logos"
                  preview={resolveDappAsset(registryDraft.dappPath, registryDraft.dappKey || "walletconnect")}
                  keyValue={registryDraft.dappKey}
                  pathValue={registryDraft.dappPath}
                  entries={registryEntries.dapp}
                  suggestedPath={registryDraft.dappKey ? suggestPublicAssetPath("dapp", registryDraft.dappKey) : ""}
                  onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, dappKey: value }))}
                  onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, dappPath: value }))}
                  onUseSuggested={() => setRegistryDraft((prev) => ({ ...prev, dappPath: suggestPublicAssetPath("dapp", prev.dappKey) }))}
                  onUpload={() => registryFileRef.current?.click()}
                  onSave={() => saveRegistry("dapp")}
                />
                <RegistryEditor
                  isLight={isLight}
                  title="Wallet logos"
                  preview={resolveWalletAsset(registryDraft.walletKey || "ledger", registryDraft.walletPath)}
                  keyValue={registryDraft.walletKey}
                  pathValue={registryDraft.walletPath}
                  entries={registryEntries.wallet}
                  suggestedPath={registryDraft.walletKey ? suggestPublicAssetPath("wallet", registryDraft.walletKey) : ""}
                  onKeyChange={(value) => setRegistryDraft((prev) => ({ ...prev, walletKey: value }))}
                  onPathChange={(value) => setRegistryDraft((prev) => ({ ...prev, walletPath: value }))}
                  onUseSuggested={() => setRegistryDraft((prev) => ({ ...prev, walletPath: suggestPublicAssetPath("wallet", prev.walletKey) }))}
                  onUpload={() => registryFileRef.current?.click()}
                  onSave={() => saveRegistry("wallet")}
                />
              </div>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => { resetAssetRegistry(); setAssetVersion((v) => v + 1); }} style={dangerButton}>Reset registry</button>
              </div>
              <input ref={registryFileRef} type="file" accept="image/*" hidden onChange={handleRegistryUpload} />
            </Panel>
          </div>
        ) : null}
      </div>
      {scannerOpen ? <WalletConnectQrScanner onClose={() => setScannerOpen(false)} onScanned={handleScannedUri} /> : null}
    </>
  );
}

function pageTitle(page: MorePage) {
  switch (page) {
    case "settings": return "Settings";
    case "walletconnect": return "WalletConnect";
    case "chains": return "Chains";
    case "wallets": return "Wallet additions";
    case "connected": return "Connected sites";
    case "assets": return "Asset registry";
    default: return "Settings";
  }
}

function pageSubtitle(page: MorePage) {
  switch (page) {
    case "settings": return "Core preferences and security only, with advanced sections moved into their own pages.";
    case "walletconnect": return "A dedicated WalletConnect page keeps the main settings screen clean.";
    case "chains": return "Manage active networks and custom RPC chains in one clean page.";
    case "wallets": return "Keep wallet additions and hardware cards out of the main settings page.";
    case "connected": return "Review and revoke site permissions in a dedicated permissions center.";
    case "assets": return "Centralize logos so changing files in public reflects across the app with less work.";
    default: return "Core preferences stay clean here, while networks, permissions and WalletConnect live on their own pages.";
  }
}

function Hero({ isLight, title, subtitle, children }: React.PropsWithChildren<{ isLight: boolean; title: string; subtitle: string }>) {
  return (
    <div style={{ borderRadius: 24, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "linear-gradient(180deg,#ffffff 0%,#f7faff 100%)" : "linear-gradient(180deg,#141d2a 0%,#0e1522 100%)", padding: 20, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 900, fontSize: 28 }}>{title}</div>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3", marginTop: 6, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function Panel({ isLight, children }: React.PropsWithChildren<{ isLight: boolean }>) {
  return <div style={{ background: isLight ? "rgba(255,255,255,.96)" : "rgba(17,23,34,.96)", border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, borderRadius: 24, padding: 20, boxShadow: isLight ? "0 18px 45px rgba(20,30,50,.08)" : "0 18px 45px rgba(0,0,0,.20)" }}>{children}</div>;
}

function SectionHeader({ title, subtitle, isLight }: { title: string; subtitle: string; isLight: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{title}</div>
      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return <label style={{ display: "grid", gap: 8 }}><span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>{children}</label>;
}

function MetricCard({ label, value, isLight }: { label: string; value: string; isLight: boolean }) {
  return <div style={{ borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 14 }}><div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div><div style={{ marginTop: 8, color: isLight ? "#10131a" : "#ffffff", fontWeight: 900, fontSize: 24 }}>{value}</div></div>;
}

function ToggleCard({ isLight, label, hint, checked, onChange }: { isLight: boolean; label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", cursor: "pointer" }}><div><div style={{ fontWeight: 800 }}>{label}</div><div style={{ fontSize: 13, marginTop: 4, color: isLight ? "#5b6578" : "#97a0b3" }}>{hint}</div></div><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}

function InfoGroup({ isLight, title, values }: { isLight: boolean; title: string; values: string[] }) {
  return <div style={{ borderRadius: 16, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 12 }}><div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{values.map((value) => <span key={`${title}-${value}`} style={chipStyle(isLight)}>{value}</span>)}</div></div>;
}

function EmptyState({ isLight, title, subtitle }: { isLight: boolean; title: string; subtitle: string }) {
  return <div style={{ padding: 18, borderRadius: 18, border: `1px dashed ${isLight ? "#cad6ea" : "#31425d"}`, color: isLight ? "#5b6578" : "#97a0b3", background: isLight ? "#f8fbff" : "#0f1624" }}><div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, marginBottom: 6 }}>{title}</div><div style={{ fontSize: 13, lineHeight: 1.55 }}>{subtitle}</div></div>;
}

function RegistryEditor({ isLight, title, preview, keyValue, pathValue, entries, suggestedPath, onKeyChange, onPathChange, onUseSuggested, onUpload, onSave }: { isLight: boolean; title: string; preview: string; keyValue: string; pathValue: string; entries: Array<{ key: string; path: string }>; suggestedPath?: string; onKeyChange: (value: string) => void; onPathChange: (value: string) => void; onUseSuggested: () => void; onUpload: () => void; onSave: () => void; }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <LogoImage src={preview} alt={title} kind="dapp" label={title} size={42} rounded={false} />
        <div><div style={{ fontWeight: 800 }}>{title}</div><div style={{ fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }}>Map once, reuse everywhere.</div></div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <input value={keyValue} onChange={(e) => onKeyChange(e.target.value)} placeholder={`${title} key`} style={inputStyle(isLight)} />
        <input value={pathValue} onChange={(e) => onPathChange(e.target.value)} placeholder="public file, URL or data:image/..." style={inputStyle(isLight)} />
        {suggestedPath ? <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12 }}>Suggested filename: <strong style={{ color: isLight ? "#10131a" : "#ffffff" }}>{suggestedPath}</strong></div> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onUpload} style={secondaryButton(isLight)}>Upload</button>
          {suggestedPath ? <button onClick={onUseSuggested} style={secondaryButton(isLight)}>Use suggested name</button> : null}
          <button onClick={onSave} style={primaryButton}>Save</button>
        </div>
        {entries.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{entries.map((entry) => <button key={`${title}-${entry.key}`} onClick={() => { onKeyChange(entry.key); onPathChange(entry.path); }} style={chipButton(isLight)}>{entry.key}</button>)}</div> : null}
      </div>
    </div>
  );
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return { width: "100%", minWidth: 0, borderRadius: 16, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#ffffff" : "#0f1624", color: isLight ? "#10131a" : "#ffffff", padding: "12px 14px", boxSizing: "border-box" };
}
function primaryButton(): React.CSSProperties { return { border: "none", borderRadius: 16, background: "#3f7cff", color: "#ffffff", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }; }
function secondaryButton(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, borderRadius: 16, background: isLight ? "#ffffff" : "#111722", color: isLight ? "#10131a" : "#ffffff", padding: "12px 16px", fontWeight: 700, cursor: "pointer" }; }
const dangerButton: React.CSSProperties = { border: "1px solid rgba(239,68,68,.35)", borderRadius: 16, background: "rgba(239,68,68,.12)", color: "#ef4444", padding: "12px 16px", fontWeight: 800, cursor: "pointer" };
function hubCardStyle(isLight: boolean): React.CSSProperties { return { display: "grid", gap: 10, textAlign: "left", borderRadius: 20, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#ffffff" : "#0f1624", padding: 16, cursor: "pointer" }; }
function miniNavCard(isLight: boolean): React.CSSProperties { return { textAlign: "left", borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1624", padding: 14, cursor: "pointer" }; }
function itemCard(isLight: boolean): React.CSSProperties { return { borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#ffffff" : "#0f1624", padding: 14 }; }
function networkCard(isLight: boolean, active: boolean): React.CSSProperties { return { textAlign: "left", borderRadius: 18, border: active ? "1px solid #4d7ef2" : `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: active ? "#3f7cff" : isLight ? "#ffffff" : "#0f1624", color: active ? "#ffffff" : isLight ? "#10131a" : "#ffffff", padding: 14, cursor: "pointer" }; }
function chipStyle(isLight: boolean): React.CSSProperties { return { display: "inline-flex", padding: "6px 10px", borderRadius: 999, background: isLight ? "#eef4ff" : "#162138", color: isLight ? "#33528f" : "#d4dfff", fontSize: 12, fontWeight: 700 }; }
function chipButton(isLight: boolean): React.CSSProperties { return { ...chipStyle(isLight), border: "none", cursor: "pointer" }; }
function pill(isLight: boolean, live: boolean): React.CSSProperties { return { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", borderRadius: 999, background: live ? "rgba(34,197,94,.14)" : isLight ? "#eef2ff" : "#162138", color: live ? "#16a34a" : "#3f7cff", fontSize: 12, fontWeight: 800, width: "fit-content" }; }
