import React, { useEffect, useMemo, useState } from "react";
import LogoImage from "../components/LogoImage";
import ConfirmModal from "../components/ConfirmModal";
import { showAppToast } from "../lib/ui";
import {
  findPresetByChainId,
  getAllNetworks,
  getHiddenPresetNetworks,
  getStoredNetwork,
  hideNetwork,
  isProtectedNetwork,
  makeNetworkFromChainId,
  restoreHiddenPresetNetwork,
  saveStoredNetwork,
  upsertCustomNetwork,
  type NetworkItem,
} from "../lib/network";

const emptyDraft = { name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" };

export default function NetworksScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [query, setQuery] = useState("");
  const [customRpc, setCustomRpc] = useState(getStoredNetwork().rpcUrl || "");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingNetworkKey, setEditingNetworkKey] = useState("");
  const [confirm, setConfirm] = useState<null | { title: string; description: string; confirmLabel: string; tone?: "danger" | "primary"; action: () => void }>(null);
  const [rpcStatus, setRpcStatus] = useState<{ type: "success" | "error" | "warning" | "info"; text: string } | null>(null);
  const [testingRpc, setTestingRpc] = useState(false);

  useEffect(() => {
    const sync = () => {
      const current = getStoredNetwork();
      setNetwork(current);
      setCustomRpc(current.rpcUrl || "");
    };
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
  }, []);

  const networks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = getAllNetworks();
    if (!q) return items;
    return items.filter((item) => [item.name, item.symbol, item.chainId].join(" ").toLowerCase().includes(q));
  }, [query, network.chainId]);

  const hiddenPresets = useMemo(() => getHiddenPresetNetworks(), [network.chainId, query]);

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingNetworkKey("");
  }

  function selectNetwork(item: NetworkItem) {
    saveStoredNetwork(item);
    setNetwork(item);
    setCustomRpc(item.rpcUrl || "");
    window.dispatchEvent(new Event("wallet-network-updated"));
    showAppToast({ type: "success", message: `${item.name} selected` });
  }

  async function testRpc(url = customRpc.trim(), expectedChainId = Number(network.chainId)) {
    if (!url) {
      setRpcStatus({ type: "warning", text: "RPC URL required" });
      showAppToast({ type: "warning", message: "RPC URL required" });
      return false;
    }
    setTestingRpc(true);
    setRpcStatus({ type: "info", text: "Testing RPC..." });
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const json = await response.json();
      const hex = String(json?.result || "");
      const got = hex ? Number.parseInt(hex, 16) : NaN;
      if (!Number.isFinite(got)) throw new Error("Invalid response");
      const text = got === expectedChainId
        ? `RPC is valid for chain ${got}`
        : `RPC responded with chain ${got}. Expected ${expectedChainId}.`;
      const type = got === expectedChainId ? "success" : "warning";
      setRpcStatus({ type, text });
      showAppToast({ type, message: text });
      return got === expectedChainId;
    } catch {
      const text = "RPC test failed. Check URL, CORS, or node availability.";
      setRpcStatus({ type: "error", text });
      showAppToast({ type: "error", message: text });
      return false;
    } finally {
      setTestingRpc(false);
    }
  }

  function confirmRpcSave() {
    setConfirm({
      title: "Save RPC for current network?",
      description: `You are about to replace the active RPC endpoint for ${network.name}. A wrong RPC can break balance loading, token discovery and contract interaction until it is fixed.`,
      confirmLabel: "Save RPC",
      tone: "primary",
      action: async () => {
        setConfirm(null);
        const valid = await testRpc(customRpc.trim(), Number(network.chainId));
        if (!valid && customRpc.trim()) return;
        const next = { ...network, rpcUrl: customRpc.trim() };
        if (!isProtectedNetwork(next.key)) upsertCustomNetwork(next);
        saveStoredNetwork(next);
        setNetwork(next);
        window.dispatchEvent(new Event("wallet-network-updated"));
        showAppToast({ type: "success", message: "RPC updated" });
      },
    });
  }

  function fillFromChainId(chainIdRaw: string) {
    const chainId = Number(chainIdRaw);
    const preset = findPresetByChainId(chainId);
    const networkFromChain = makeNetworkFromChainId(chainId);
    if (!chainId || !networkFromChain) return;
    setDraft((prev) => ({
      ...prev,
      name: prev.name || networkFromChain.name,
      symbol: prev.symbol || networkFromChain.symbol,
      rpcUrl: prev.rpcUrl || networkFromChain.rpcUrl,
      explorerUrl: prev.explorerUrl || (networkFromChain.explorerAddressUrl || "").replace(/\/address\/$/, ""),
      logo: prev.logo || networkFromChain.logo,
      chainId: chainIdRaw,
    }));
    if (preset) showAppToast({ type: "info", message: `Preset found for ${preset.name}` });
  }

  function startEdit(item: NetworkItem) {
    if (isProtectedNetwork(item.key) || isProtectedNetwork(item.chainId)) return;
    setEditingNetworkKey(item.key || String(item.chainId));
    setDraft({
      name: item.name,
      chainId: String(item.chainId),
      symbol: item.symbol,
      rpcUrl: item.rpcUrl,
      explorerUrl: (item.explorerAddressUrl || "").replace(/\/address\/$/, ""),
      logo: item.logo || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateExplorerUrl(raw: string) {
    const value = raw.trim();
    if (!value) return true;
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol);
    } catch {
      return false;
    }
  }

  function saveCustom() {
    const chainId = Number(draft.chainId);
    if (!draft.name.trim() || !chainId || !draft.rpcUrl.trim()) return showAppToast({ type: "warning", message: "Name, chain ID and RPC URL are required" });
    if (isProtectedNetwork(chainId) || isProtectedNetwork(draft.name.trim().toLowerCase())) return showAppToast({ type: "warning", message: "INRI is protected" });
    if (!validateExplorerUrl(draft.explorerUrl)) return showAppToast({ type: "warning", message: "Explorer URL must be a valid http or https address" });
    const explorerBase = draft.explorerUrl.trim().replace(/\/$/, "");
    const item: NetworkItem = {
      key: editingNetworkKey || draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: draft.name.trim(),
      chainId,
      symbol: draft.symbol.trim() || "ETH",
      rpcUrl: draft.rpcUrl.trim(),
      explorerAddressUrl: explorerBase ? `${explorerBase}/address/` : "",
      explorerTxUrl: explorerBase ? `${explorerBase}/tx/` : "",
      logo: draft.logo.trim(),
      isCustom: true,
    };
    const saved = upsertCustomNetwork(item);
    resetDraft();
    showAppToast({ type: "success", message: `${saved.name} saved` });
  }

  function askRemoveNetwork(item: NetworkItem) {
    if (isProtectedNetwork(item.key) || isProtectedNetwork(item.chainId)) return showAppToast({ type: "warning", message: "INRI cannot be removed" });
    const isActive = Number(item.chainId) === Number(network.chainId);
    setConfirm({
      title: `Remove ${item.name}?`,
      description: isActive
        ? `${item.name} is the active network right now. The wallet will fall back to INRI after removal.`
        : `This will remove ${item.name} from the wallet list. Preset networks can be restored later.` ,
      confirmLabel: "Remove network",
      tone: "danger",
      action: () => {
        hideNetwork(item);
        if (editingNetworkKey === (item.key || String(item.chainId))) resetDraft();
        if (isActive) {
          const all = getAllNetworks();
          const fallback = all.find((entry) => isProtectedNetwork(entry.key) || isProtectedNetwork(entry.chainId)) || all[0];
          if (fallback) selectNetwork(fallback);
        }
        setConfirm(null);
        showAppToast({ type: "success", message: `${item.name} removed` });
      },
    });
  }

  function restorePreset(item: NetworkItem) {
    restoreHiddenPresetNetwork(item.chainId);
    showAppToast({ type: "success", message: `${item.name} restored` });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={titleStyle(isLight)}>Networks</div>
        <div style={subtitleStyle(isLight)}>Edit or remove custom and preset networks, keep INRI protected, validate explorer links and test RPC before saving.</div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Active network</div>
        <div className="wallet-responsive-2col" style={{ gap: 14, alignItems: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
            <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} symbol={network.symbol} size={56} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>{network.name}</div>
              <div style={subtitleStyle(isLight)}>Chain {network.chainId} • {network.symbol}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder="RPC URL" style={inputStyle(isLight)} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => testRpc()} style={ghostButton(isLight)} disabled={testingRpc}>{testingRpc ? "Testing..." : "Test RPC"}</button>
              <button onClick={confirmRpcSave} style={primaryButtonStyle()} disabled={testingRpc}>Save RPC</button>
            </div>
            {rpcStatus ? <div style={statusStyle(isLight, rpcStatus.type)}>{rpcStatus.text}</div> : null}
          </div>
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Available networks</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, symbol or chain ID" style={inputStyle(isLight)} />
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {networks.map((item) => {
            const locked = isProtectedNetwork(item.key) || isProtectedNetwork(item.chainId);
            return (
              <div key={`${item.key}-${item.chainId}`} style={rowStyle(isLight)}>
                <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div>
                    <div style={subtitleStyle(isLight)}>Chain {item.chainId} • {item.symbol}{item.isCustom ? " • Custom" : " • Preset"}{locked ? " • Protected" : ""}</div>
                  </div>
                </div>
                <div className="wallet-action-wrap" style={{ justifyContent: "flex-end" }}>
                  <button onClick={() => selectNetwork(item)} style={ghostButton(isLight)}>{Number(item.chainId) === Number(network.chainId) ? "Active" : "Select"}</button>
                  {!locked ? <button onClick={() => startEdit(item)} style={ghostButton(isLight)}>Edit</button> : null}
                  {!locked ? <button onClick={() => askRemoveNetwork(item)} style={dangerButton(isLight)}>Remove</button> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {hiddenPresets.length ? (
        <section style={cardStyle(isLight)}>
          <div style={sectionTitleStyle(isLight)}>Restore removed preset networks</div>
          <div style={{ display: "grid", gap: 8 }}>
            {hiddenPresets.map((item) => (
              <div key={`restore-${item.chainId}`} style={rowStyle(isLight)}>
                <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                  <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={44} />
                  <div>
                    <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div>
                    <div style={subtitleStyle(isLight)}>Chain {item.chainId} • {item.symbol}</div>
                  </div>
                </div>
                <button onClick={() => restorePreset(item)} style={ghostButton(isLight)}>Restore</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>{editingNetworkKey ? "Edit network" : "Add custom network"}</div>
        <div className="wallet-form-grid">
          <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Network name" style={inputStyle(isLight)} />
          <input value={draft.chainId} onChange={(e) => { setDraft((prev) => ({ ...prev, chainId: e.target.value })); if (!editingNetworkKey) fillFromChainId(e.target.value); }} placeholder="Chain ID" style={inputStyle(isLight)} />
          <input value={draft.symbol} onChange={(e) => setDraft((prev) => ({ ...prev, symbol: e.target.value }))} placeholder="Currency symbol" style={inputStyle(isLight)} />
          <input value={draft.rpcUrl} onChange={(e) => setDraft((prev) => ({ ...prev, rpcUrl: e.target.value }))} placeholder="RPC URL" style={inputStyle(isLight)} />
          <input value={draft.explorerUrl} onChange={(e) => setDraft((prev) => ({ ...prev, explorerUrl: e.target.value }))} placeholder="Explorer URL" style={inputStyle(isLight)} />
          <input value={draft.logo} onChange={(e) => setDraft((prev) => ({ ...prev, logo: e.target.value }))} placeholder="Logo path or URL" style={inputStyle(isLight)} />
        </div>
        <div className="wallet-action-wrap" style={{ marginTop: 12 }}>
          {editingNetworkKey ? <button onClick={resetDraft} style={ghostButton(isLight)}>Cancel</button> : null}
          <button onClick={() => testRpc(draft.rpcUrl.trim(), Number(draft.chainId || 0))} style={ghostButton(isLight)}>Test draft RPC</button>
          <button onClick={saveCustom} style={primaryButtonStyle()}>{editingNetworkKey ? "Save changes" : "Save network"}</button>
        </div>
      </section>

      <ConfirmModal
        open={!!confirm}
        theme={theme}
        title={confirm?.title || ""}
        description={confirm?.description || ""}
        confirmLabel={confirm?.confirmLabel || "Confirm"}
        tone={confirm?.tone || "danger"}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 }; }
function titleStyle(isLight: boolean): React.CSSProperties { return { fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }; }
function sectionTitleStyle(isLight: boolean): React.CSSProperties { return { fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", marginBottom: 12 }; }
function subtitleStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0d1420", color: isLight ? "#10131a" : "#ffffff", boxSizing: "border-box" }; }
function primaryButtonStyle(): React.CSSProperties { return { padding: "12px 14px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function ghostButton(isLight: boolean): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1520", color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }; }
function dangerButton(isLight: boolean): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: `1px solid ${isLight ? "rgba(255,123,123,.26)" : "rgba(255,123,123,.26)"}`, background: "rgba(255,123,123,.08)", color: "#ff7b7b", fontWeight: 800, cursor: "pointer" }; }
function rowStyle(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`, background: isLight ? "#f8fbff" : "#0f1520" }; }
function statusStyle(isLight: boolean, type: "success" | "error" | "warning" | "info"): React.CSSProperties {
  const tone = type === "success" ? { border: "rgba(16,185,129,.26)", bg: isLight ? "#eefaf1" : "rgba(16,185,129,.08)", color: isLight ? "#1f7a4f" : "#74f0b4" } : type === "error" ? { border: "rgba(255,123,123,.26)", bg: isLight ? "#fff2f2" : "rgba(255,123,123,.08)", color: "#ff7b7b" } : type === "warning" ? { border: "rgba(245,158,11,.26)", bg: isLight ? "#fff8eb" : "rgba(245,158,11,.08)", color: isLight ? "#9a6800" : "#ffd98a" } : { border: "rgba(63,124,255,.26)", bg: isLight ? "#eef4ff" : "rgba(63,124,255,.08)", color: isLight ? "#1f57c9" : "#8cb2ff" };
  return { padding: "10px 12px", borderRadius: 14, border: `1px solid ${tone.border}`, background: tone.bg, color: tone.color, fontSize: 13, fontWeight: 700 };
}
