import React, { useMemo, useState } from "react";
import LogoImage from "../components/LogoImage";
import ConfirmModal from "../components/ConfirmModal";
import {
  updateAssetRegistryEntry,
  removeAssetRegistryEntry,
  resetAssetRegistry,
  resolveDappAsset,
  resolveNetworkAsset,
  resolveTokenAsset,
  resolveWalletAsset,
  sanitizeAssetKey,
  suggestPublicAssetPath,
  listRegistryEntries,
  type AssetKind,
} from "../lib/assets";
import { showAppToast } from "../lib/ui";

type RegistryDraft = { key: string; path: string };
const kinds: AssetKind[] = ["network", "token", "dapp", "wallet"];

export default function AssetManagerScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const isLight = theme === "light";
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState<RegistryDraft>({ key: "", path: "" });
  const [activeKind, setActiveKind] = useState<AssetKind>("network");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<null | { title: string; description: string; confirmLabel: string; action: () => void }>(null);

  const entries = useMemo(() => {
    const all = listRegistryEntries(activeKind);
    const q = query.trim().toLowerCase();
    return q ? all.filter((entry) => `${entry.key} ${entry.path}`.toLowerCase().includes(q)) : all;
  }, [activeKind, query, version]);

  function refresh(message?: string, type: "success" | "error" | "warning" | "info" = "success") {
    setVersion((v) => v + 1);
    window.dispatchEvent(new Event("wallet-assets-updated"));
    if (message) showAppToast({ message, type });
  }

  function previewSrc(kind: AssetKind, key: string, path: string) {
    if (kind === "network") return resolveNetworkAsset({ key, name: key, logo: path });
    if (kind === "token") return resolveTokenAsset({ symbol: key, name: key, logo: path });
    if (kind === "dapp") return resolveDappAsset({ name: key, logo: path });
    return resolveWalletAsset({ name: key, logo: path });
  }

  function resetDraft() {
    setDraft({ key: "", path: "" });
  }

  function saveEntry() {
    const key = sanitizeAssetKey(draft.key);
    const path = draft.path.trim();
    if (!key || !path) return showAppToast({ type: "warning", message: "Key and path are required" });
    updateAssetRegistryEntry(activeKind, key, path, key);
    resetDraft();
    refresh(`${activeKind} asset saved`, "success");
  }

  function editEntry(entry: { key: string; path: string }) {
    setDraft({ key: entry.key, path: entry.path });
  }

  function removeEntry(key: string) {
    removeAssetRegistryEntry(activeKind, key);
    if (sanitizeAssetKey(draft.key) === key) resetDraft();
    setConfirm(null);
    refresh(`${activeKind} asset removed`, "success");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={titleStyle(isLight)}>Asset Manager</div>
        <div style={subtitleStyle(isLight)}>Manage network, token, dapp and wallet logos with search, preview, edit and remove. This is the clean admin layer for images inside /public or external URLs.</div>
      </section>

      <section style={cardStyle(isLight)}>
        <div className="wallet-action-wrap" style={{ marginBottom: 12 }}>
          {kinds.map((kind) => (
            <button key={kind} onClick={() => setActiveKind(kind)} style={kind === activeKind ? activeButtonStyle() : ghostButton(isLight)}>{label(kind)}</button>
          ))}
        </div>

        <div className="wallet-responsive-2col" style={{ gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={sectionTitleStyle(isLight)}>{draft.key ? "Edit entry" : `Add ${label(activeKind).toLowerCase()} logo`}</div>
            <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
              <LogoImage src={previewSrc(activeKind, draft.key, draft.path)} alt={draft.key || label(activeKind)} kind={activeKind} label={draft.key || label(activeKind)} size={72} />
              <div style={{ display: "grid", gap: 10 }}>
                <input value={draft.key} onChange={(e) => setDraft((prev) => ({ ...prev, key: e.target.value }))} placeholder={`${label(activeKind)} key`} style={inputStyle(isLight)} />
                <input value={draft.path} onChange={(e) => setDraft((prev) => ({ ...prev, path: e.target.value }))} placeholder="Public path or URL" style={inputStyle(isLight)} />
              </div>
            </div>
            <div className="wallet-action-wrap">
              <button onClick={() => setDraft((prev) => ({ ...prev, path: suggestPublicAssetPath(activeKind, sanitizeAssetKey(prev.key)) }))} style={ghostButton(isLight)}>Suggest /public path</button>
              {draft.key || draft.path ? <button onClick={resetDraft} style={ghostButton(isLight)}>Cancel</button> : null}
              <button onClick={saveEntry} style={activeButtonStyle()}>{draft.key ? "Save entry" : "Add entry"}</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={sectionTitleStyle(isLight)}>Registry entries</div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search key or path" style={{ ...inputStyle(isLight), width: "min(280px, 100%)" }} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {entries.length === 0 ? <div style={emptyStateStyle(isLight)}>No custom {label(activeKind).toLowerCase()} entries yet.</div> : entries.map((entry) => (
                <div key={`${activeKind}-${entry.key}`} style={rowStyle(isLight)}>
                  <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                    <LogoImage src={previewSrc(activeKind, entry.key, entry.path)} alt={entry.key} kind={activeKind} label={entry.key} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{entry.key}</div>
                      <div style={subtitleStyle(isLight)}>{entry.path}</div>
                    </div>
                  </div>
                  <div className="wallet-action-wrap" style={{ justifyContent: "flex-end" }}>
                    <button onClick={() => editEntry(entry)} style={ghostButton(isLight)}>Edit</button>
                    <button onClick={() => setConfirm({ title: `Remove ${entry.key}?`, description: `This will remove the ${label(activeKind).toLowerCase()} logo override from the registry.`, confirmLabel: "Remove", action: () => removeEntry(entry.key) })} style={dangerButton()}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Registry maintenance</div>
        <div style={subtitleStyle(isLight)}>Use predictable names like network-inri.png, token-iusd.png or wallet-ledger.png. The wallet checks the registry first and falls back to defaults after that.</div>
        <div className="wallet-action-wrap" style={{ marginTop: 12 }}>
          <button onClick={() => setConfirm({ title: "Reset entire registry?", description: "All custom logo overrides will be cleared and the wallet will fall back to default assets.", confirmLabel: "Reset registry", action: () => { resetAssetRegistry(); resetDraft(); setConfirm(null); refresh("Asset registry reset", "warning"); } })} style={ghostButton(isLight)}>Reset registry</button>
        </div>
      </section>

      <ConfirmModal
        open={!!confirm}
        theme={theme}
        title={confirm?.title || ""}
        description={confirm?.description || ""}
        confirmLabel={confirm?.confirmLabel || "Confirm"}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function label(kind: AssetKind) {
  return kind === "network" ? "Networks" : kind === "token" ? "Tokens" : kind === "dapp" ? "Dapps" : "Wallets";
}
function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 }; }
function titleStyle(isLight: boolean): React.CSSProperties { return { fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }; }
function sectionTitleStyle(isLight: boolean): React.CSSProperties { return { fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }; }
function subtitleStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13, overflowWrap: "anywhere" }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0d1420", color: isLight ? "#10131a" : "#ffffff", boxSizing: "border-box" }; }
function activeButtonStyle(): React.CSSProperties { return { padding: "12px 14px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function ghostButton(isLight: boolean): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1520", color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }; }
function dangerButton(): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: "1px solid rgba(255,123,123,.26)", background: "rgba(255,123,123,.08)", color: "#ff7b7b", fontWeight: 800, cursor: "pointer" }; }
function rowStyle(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`, background: isLight ? "#f8fbff" : "#0f1520" }; }
function emptyStateStyle(isLight: boolean): React.CSSProperties { return { padding: 18, borderRadius: 16, border: `1px dashed ${isLight ? "#d9e2f0" : "#2b3950"}`, color: isLight ? "#5b6578" : "#97a0b3" }; }
