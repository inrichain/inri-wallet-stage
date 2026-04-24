import React, { useEffect, useMemo, useState } from "react";
import LogoImage from "../components/LogoImage";
import ConfirmModal from "../components/ConfirmModal";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
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
  const inputClass = `wallet-ui-input ${isLight ? "light" : ""}`.trim();

  function resetDraft() { setDraft(emptyDraft); setEditingNetworkKey(""); }

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
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
      const json = await response.json();
      const hex = String(json?.result || "");
      const got = hex ? Number.parseInt(hex, 16) : NaN;
      if (!Number.isFinite(got)) throw new Error("Invalid response");
      const text = got === expectedChainId ? `RPC is valid for chain ${got}` : `RPC responded with chain ${got}. Expected ${expectedChainId}.`;
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
      description: isActive ? `${item.name} is the active network right now. The wallet will fall back to INRI after removal.` : `This will remove ${item.name} from the wallet list. Preset networks can be restored later.`,
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Networks" subtitle="Edit or remove custom and preset networks, keep INRI protected, validate explorer links and test RPC before saving." />
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Active network" compact subtitle="Quickly review and update the current endpoint without leaving the wallet." actions={<StatusPill theme={theme} tone="primary">Chain {network.chainId}</StatusPill>} />
        <div className="wallet-responsive-2col" style={{ gap: 14, alignItems: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
            <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} symbol={network.symbol} size={56} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>{network.name}</div>
              <div className="wallet-ui-subtle">Chain {network.chainId} • {network.symbol}</div>
            </div>
          </div>
          <div className="wallet-mobile-stack">
            <input value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder="RPC URL" className={inputClass} />
            <div className="wallet-action-row">
              <ActionButton theme={theme} tone="secondary" onClick={() => testRpc()}>{testingRpc ? "Testing..." : "Test RPC"}</ActionButton>
              <ActionButton theme={theme} tone="primary" onClick={confirmRpcSave}>Save RPC</ActionButton>
            </div>
            {rpcStatus ? <StatusPill theme={theme} tone={rpcStatus.type === "success" ? "success" : rpcStatus.type === "error" ? "danger" : rpcStatus.type === "warning" ? "warning" : "primary"}>{rpcStatus.text}</StatusPill> : null}
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={editingNetworkKey ? "Edit network" : "Add network"} compact subtitle="Preset data can be pulled automatically from a known chain ID." />
        <div className="wallet-form-grid">
          <input className={inputClass} placeholder="Network name" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
          <input className={inputClass} placeholder="Chain ID" value={draft.chainId} onChange={(e) => { setDraft((prev) => ({ ...prev, chainId: e.target.value })); fillFromChainId(e.target.value); }} />
          <input className={inputClass} placeholder="Symbol" value={draft.symbol} onChange={(e) => setDraft((prev) => ({ ...prev, symbol: e.target.value }))} />
          <input className={inputClass} placeholder="RPC URL" value={draft.rpcUrl} onChange={(e) => setDraft((prev) => ({ ...prev, rpcUrl: e.target.value }))} />
          <input className={inputClass} placeholder="Explorer base URL" value={draft.explorerUrl} onChange={(e) => setDraft((prev) => ({ ...prev, explorerUrl: e.target.value }))} />
          <input className={inputClass} placeholder="Logo path or URL" value={draft.logo} onChange={(e) => setDraft((prev) => ({ ...prev, logo: e.target.value }))} />
        </div>
        <div className="wallet-action-row">
          {editingNetworkKey ? <ActionButton theme={theme} tone="ghost" onClick={resetDraft}>Cancel</ActionButton> : null}
          <ActionButton theme={theme} tone="primary" onClick={saveCustom}>{editingNetworkKey ? "Save changes" : "Add network"}</ActionButton>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Available networks" compact subtitle="Search, switch, edit or remove networks. INRI always stays protected." actions={<StatusPill theme={theme} tone="neutral">{networks.length} visible</StatusPill>} />
        <input className={inputClass} placeholder="Search by name, symbol or chain ID" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div style={{ display: "grid", gap: 8 }}>
          {!networks.length ? <EmptyState theme={theme} title="No networks found" description="Try a different search or restore a hidden preset network below." /> : networks.map((item) => {
            const active = Number(item.chainId) === Number(network.chainId);
            const protectedNet = isProtectedNetwork(item.key) || isProtectedNetwork(item.chainId);
            return (
              <div key={item.key || item.chainId} className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                  <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div>
                      {active ? <StatusPill theme={theme} tone="primary">Active</StatusPill> : null}
                      {protectedNet ? <StatusPill theme={theme} tone="success">Protected</StatusPill> : item.isCustom ? <StatusPill theme={theme} tone="warning">Custom</StatusPill> : <StatusPill theme={theme} tone="neutral">Preset</StatusPill>}
                    </div>
                    <div className="wallet-ui-subtle">Chain {item.chainId} • {item.symbol}</div>
                    <div className="wallet-ui-subtle">{item.rpcUrl}</div>
                  </div>
                </div>
                <div className="wallet-action-row">
                  {!active ? <ActionButton theme={theme} tone="primary" compact onClick={() => selectNetwork(item)}>Use</ActionButton> : null}
                  {!protectedNet ? <ActionButton theme={theme} tone="secondary" compact onClick={() => startEdit(item)}>Edit</ActionButton> : null}
                  {!protectedNet ? <ActionButton theme={theme} tone="danger" compact onClick={() => askRemoveNetwork(item)}>Remove</ActionButton> : null}
                </div>
              </div>
            );
          })}
        </div>
      </ScreenCard>

      {hiddenPresets.length ? (
        <ScreenCard theme={theme}>
          <SectionTitle theme={theme} title="Hidden presets" compact subtitle="Restore any preset network you removed from the visible list." />
          <div style={{ display: "grid", gap: 8 }}>
            {hiddenPresets.map((item) => (
              <div key={`hidden-${item.chainId}`} className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                  <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={42} />
                  <div>
                    <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div>
                    <div className="wallet-ui-subtle">Chain {item.chainId} • {item.symbol}</div>
                  </div>
                </div>
                <div className="wallet-action-row">
                  <ActionButton theme={theme} tone="secondary" compact onClick={() => restoreHiddenPresetNetwork(item.chainId)}>Restore</ActionButton>
                </div>
              </div>
            ))}
          </div>
        </ScreenCard>
      ) : null}

      <ConfirmModal open={!!confirm} theme={theme} title={confirm?.title || ""} description={confirm?.description || ""} confirmLabel={confirm?.confirmLabel || "Confirm"} tone={confirm?.tone || "danger"} onConfirm={() => confirm?.action()} onCancel={() => setConfirm(null)} />
    </div>
  );
}
