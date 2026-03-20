import React, { useEffect, useMemo, useState } from "react";
import LogoImage from "../components/LogoImage";
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

export default function NetworksScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [query, setQuery] = useState("");
  const [customRpc, setCustomRpc] = useState(getStoredNetwork().rpcUrl || "");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" });

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

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  }

  function selectNetwork(item: NetworkItem) {
    saveStoredNetwork(item);
    setNetwork(item);
    setCustomRpc(item.rpcUrl || "");
    window.dispatchEvent(new Event("wallet-network-updated"));
    showMessage(`${item.name} selected`);
  }

  function saveRpc() {
    if (!customRpc.trim()) return showMessage("RPC URL required");
    const next = { ...network, rpcUrl: customRpc.trim() };
    if (network.isCustom) upsertCustomNetwork(next);
    saveStoredNetwork(next);
    setNetwork(next);
    window.dispatchEvent(new Event("wallet-network-updated"));
    showMessage("RPC updated");
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
    if (preset) showMessage(`Preset found for ${preset.name}`);
  }

  function saveCustom() {
    const chainId = Number(draft.chainId);
    if (!draft.name.trim() || !chainId || !draft.rpcUrl.trim()) return showMessage("Name, chain ID and RPC URL are required");
    const explorerBase = draft.explorerUrl.trim().replace(/\/$/, "");
    const item: NetworkItem = {
      key: draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
    setDraft({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" });
    showMessage(`${saved.name} saved`);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={titleStyle(isLight)}>Networks</div>
        <div style={subtitleStyle(isLight)}>Dedicated chain management keeps Settings clean and makes RPC editing much safer.</div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Active network</div>
        <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
          <LogoImage src={network.logo} alt={network.name} kind="network" label={network.name} symbol={network.symbol} size={56} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>{network.name}</div>
            <div style={subtitleStyle(isLight)}>Chain {network.chainId} • {network.symbol}</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <input value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder="RPC URL" style={inputStyle(isLight)} />
          <button onClick={saveRpc} style={primaryButtonStyle()}>Save RPC for current network</button>
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Available networks</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, symbol or chain ID" style={inputStyle(isLight)} />
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {networks.map((item) => (
            <div key={`${item.key}-${item.chainId}`} style={rowStyle(isLight)}>
              <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, alignItems: "center", minWidth: 0 }}>
                <LogoImage src={item.logo} alt={item.name} kind="network" label={item.name} symbol={item.symbol} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div>
                  <div style={subtitleStyle(isLight)}>Chain {item.chainId} • {item.symbol}{item.isCustom ? " • Custom" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => selectNetwork(item)} style={ghostButton(isLight)}>{Number(item.chainId) === Number(network.chainId) ? "Active" : "Select"}</button>
                {item.isCustom ? <button onClick={() => removeCustomNetwork(item.chainId)} style={dangerButton(isLight)}>Remove</button> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Add or edit custom network</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Network name" style={inputStyle(isLight)} />
          <input value={draft.chainId} onChange={(e) => { setDraft((prev) => ({ ...prev, chainId: e.target.value })); fillFromChainId(e.target.value); }} placeholder="Chain ID" style={inputStyle(isLight)} />
          <input value={draft.symbol} onChange={(e) => setDraft((prev) => ({ ...prev, symbol: e.target.value }))} placeholder="Native symbol" style={inputStyle(isLight)} />
          <input value={draft.rpcUrl} onChange={(e) => setDraft((prev) => ({ ...prev, rpcUrl: e.target.value }))} placeholder="RPC URL" style={inputStyle(isLight)} />
          <input value={draft.explorerUrl} onChange={(e) => setDraft((prev) => ({ ...prev, explorerUrl: e.target.value }))} placeholder="Explorer base URL" style={inputStyle(isLight)} />
          <input value={draft.logo} onChange={(e) => setDraft((prev) => ({ ...prev, logo: e.target.value }))} placeholder="Logo path or URL" style={inputStyle(isLight)} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={saveCustom} style={primaryButtonStyle()}>Save custom network</button>
          <button onClick={() => setDraft({ name: "", chainId: "", symbol: "", rpcUrl: "", explorerUrl: "", logo: "" })} style={ghostButton(isLight)}>Reset form</button>
        </div>
        {message ? <div style={{ marginTop: 12, color: "#3f7cff", fontWeight: 800 }}>{message}</div> : null}
      </section>
    </div>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 }; }
function titleStyle(isLight: boolean): React.CSSProperties { return { fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }; }
function sectionTitleStyle(isLight: boolean): React.CSSProperties { return { fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", marginBottom: 12 }; }
function subtitleStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0d1420", color: isLight ? "#10131a" : "#ffffff", boxSizing: "border-box" }; }
function primaryButtonStyle(): React.CSSProperties { return { padding: "12px 14px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function ghostButton(isLight: boolean): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1520", color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function dangerButton(isLight: boolean): React.CSSProperties { return { ...ghostButton(isLight), color: "#ff7b7b" }; }
function rowStyle(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`, background: isLight ? "#f8fbff" : "#0f1520" }; }
