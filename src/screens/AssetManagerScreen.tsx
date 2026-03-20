import React, { useMemo, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import LogoImage from "../components/LogoImage";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import { showAppToast } from "../lib/ui";
import {
  AssetKind,
  listRegistryEntries,
  removeAssetRegistryEntry,
  resetAssetRegistry,
  resolveDappAsset,
  resolveNetworkAsset,
  resolveTokenAsset,
  resolveWalletAsset,
  sanitizeAssetKey,
  suggestPublicAssetPath,
  updateAssetRegistryEntry,
} from "../lib/assets";

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

  function resetDraft() { setDraft({ key: "", path: "" }); }

  function saveEntry() {
    const key = sanitizeAssetKey(draft.key);
    const path = draft.path.trim();
    if (!key || !path) return showAppToast({ type: "warning", message: "Key and path are required" });
    updateAssetRegistryEntry(activeKind, key, path, key);
    resetDraft();
    refresh(`${activeKind} asset saved`, "success");
  }

  function editEntry(entry: { key: string; path: string }) { setDraft({ key: entry.key, path: entry.path }); }

  function removeEntry(key: string) {
    removeAssetRegistryEntry(activeKind, key);
    if (sanitizeAssetKey(draft.key) === key) resetDraft();
    setConfirm(null);
    refresh(`${activeKind} asset removed`, "success");
  }

  const inputClass = `wallet-ui-input ${isLight ? "light" : ""}`.trim();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Asset Manager" subtitle="Manage network, token, dapp and wallet logos with search, preview, edit and remove. This is the clean admin layer for images inside /public or external URLs." />
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Registry editor" compact actions={
          kinds.map((kind) => (
            <ActionButton key={kind} theme={theme} tone={kind === activeKind ? "primary" : "secondary"} compact onClick={() => setActiveKind(kind)}>{label(kind)}</ActionButton>
          ))
        } />

        <div className="wallet-responsive-2col" style={{ gap: 16, alignItems: "start" }}>
          <div className="wallet-form-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#dde6f3" : "#223044" }}>
            <SectionTitle theme={theme} title={draft.key ? "Edit entry" : `Add ${label(activeKind).toLowerCase()} logo`} compact subtitle="Use public file paths or direct image URLs." />
            <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
              <LogoImage src={previewSrc(activeKind, draft.key, draft.path)} alt={draft.key || label(activeKind)} kind={activeKind} label={draft.key || label(activeKind)} size={72} />
              <div style={{ display: "grid", gap: 10 }}>
                <input value={draft.key} onChange={(e) => setDraft((prev) => ({ ...prev, key: e.target.value }))} placeholder={`${label(activeKind)} key`} className={inputClass} />
                <input value={draft.path} onChange={(e) => setDraft((prev) => ({ ...prev, path: e.target.value }))} placeholder="Public path or URL" className={inputClass} />
              </div>
            </div>
            <div className="wallet-action-row">
              <ActionButton theme={theme} tone="secondary" onClick={() => setDraft((prev) => ({ ...prev, path: suggestPublicAssetPath(activeKind, sanitizeAssetKey(prev.key)) }))}>Suggest /public path</ActionButton>
              {(draft.key || draft.path) ? <ActionButton theme={theme} tone="ghost" onClick={resetDraft}>Cancel</ActionButton> : null}
              <ActionButton theme={theme} tone="primary" onClick={saveEntry}>{draft.key ? "Save entry" : "Add entry"}</ActionButton>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <SectionTitle theme={theme} title="Registry entries" compact subtitle="Search by key or file path." actions={<StatusPill theme={theme} tone="neutral">{entries.length} items</StatusPill>} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search key or path" className={inputClass} />
            <div style={{ display: "grid", gap: 8 }}>
              {entries.length === 0 ? (
                <EmptyState theme={theme} title={`No custom ${label(activeKind).toLowerCase()} entries`} description="Add your first override to keep the wallet visuals clean and fully controlled from the registry." />
              ) : entries.map((entry) => (
                <div key={`${activeKind}-${entry.key}`} className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                    <LogoImage src={previewSrc(activeKind, entry.key, entry.path)} alt={entry.key} kind={activeKind} label={entry.key} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{entry.key}</div>
                      <div className="wallet-ui-subtle">{entry.path}</div>
                    </div>
                  </div>
                  <div className="wallet-action-row">
                    <ActionButton theme={theme} tone="secondary" compact onClick={() => editEntry(entry)}>Edit</ActionButton>
                    <ActionButton theme={theme} tone="danger" compact onClick={() => setConfirm({ title: `Remove ${entry.key}?`, description: `This will remove the ${label(activeKind).toLowerCase()} logo override from the registry.`, confirmLabel: "Remove", action: () => removeEntry(entry.key) })}>Remove</ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Registry maintenance" compact subtitle="Use predictable names like network-inri.png, token-iusd.png or wallet-ledger.png. The wallet checks the registry first and falls back to defaults after that." />
        <div className="wallet-action-row">
          <ActionButton theme={theme} tone="ghost" onClick={() => setConfirm({ title: "Reset entire registry?", description: "All custom logo overrides will be cleared and the wallet will fall back to default assets.", confirmLabel: "Reset registry", action: () => { resetAssetRegistry(); resetDraft(); setConfirm(null); refresh("Asset registry reset", "warning"); } })}>Reset registry</ActionButton>
        </div>
      </ScreenCard>

      <ConfirmModal open={!!confirm} theme={theme} title={confirm?.title || ""} description={confirm?.description || ""} confirmLabel={confirm?.confirmLabel || "Confirm"} onConfirm={() => confirm?.action()} onCancel={() => setConfirm(null)} />
    </div>
  );
}

function label(kind: AssetKind) {
  return kind === "network" ? "Networks" : kind === "token" ? "Tokens" : kind === "dapp" ? "Dapps" : "Wallets";
}
