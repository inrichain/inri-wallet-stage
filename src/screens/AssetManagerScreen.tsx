import React, { useMemo, useRef, useState } from "react";
import LogoImage from "../components/LogoImage";
import {
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

export default function AssetManagerScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const isLight = theme === "light";
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<RegistryDraft>({ networkKey: "", networkPath: "", tokenKey: "", tokenPath: "", dappKey: "", dappPath: "", walletKey: "", walletPath: "" });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const networkEntries = useMemo(() => listRegistryEntries("network").slice(0, 14), [version]);
  const tokenEntries = useMemo(() => listRegistryEntries("token").slice(0, 14), [version]);
  const dappEntries = useMemo(() => listRegistryEntries("dapp").slice(0, 14), [version]);
  const walletEntries = useMemo(() => listRegistryEntries("wallet").slice(0, 14), [version]);

  function refresh(note?: string) {
    setVersion((v) => v + 1);
    if (note) {
      setMessage(note);
      window.setTimeout(() => setMessage(""), 2400);
    }
    window.dispatchEvent(new Event("wallet-assets-updated"));
  }

  function saveEntry(kind: "network" | "token" | "dapp" | "wallet") {
    const keyField = `${kind}Key` as const;
    const pathField = `${kind}Path` as const;
    const key = sanitizeAssetKey(draft[keyField]);
    const path = draft[pathField].trim();
    if (!key || !path) return refresh("Key and path are required");
    updateAssetRegistryEntry(kind, key, { path, label: key });
    setDraft((prev) => ({ ...prev, [keyField]: "", [pathField]: "" }));
    refresh(`${kind} asset saved`);
  }

  function handleSuggestedPath(kind: "network" | "token" | "dapp" | "wallet", rawKey: string) {
    const cleanKey = sanitizeAssetKey(rawKey);
    const path = suggestPublicAssetPath(kind, cleanKey);
    const pathField = `${kind}Path` as const;
    setDraft((prev) => ({ ...prev, [pathField]: path }));
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={titleStyle(isLight)}>Asset Manager</div>
        <div style={subtitleStyle(isLight)}>This is the clean place to control network, token, dapp and wallet logos. It fits your plan to manage images through the public folder.</div>
        {message ? <div style={{ marginTop: 10, color: "#3f7cff", fontWeight: 800 }}>{message}</div> : null}
      </section>

      {renderBlock("network", "Networks", draft, setDraft, isLight, saveEntry, handleSuggestedPath, resolveNetworkAsset({ key: draft.networkKey, name: draft.networkKey, logo: draft.networkPath }), networkEntries)}
      {renderBlock("token", "Tokens", draft, setDraft, isLight, saveEntry, handleSuggestedPath, resolveTokenAsset({ symbol: draft.tokenKey, logo: draft.tokenPath }), tokenEntries)}
      {renderBlock("dapp", "Dapps", draft, setDraft, isLight, saveEntry, handleSuggestedPath, resolveDappAsset({ name: draft.dappKey, logo: draft.dappPath }), dappEntries)}
      {renderBlock("wallet", "Wallets", draft, setDraft, isLight, saveEntry, handleSuggestedPath, resolveWalletAsset({ name: draft.walletKey, logo: draft.walletPath }), walletEntries)}

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Registry maintenance</div>
        <div style={subtitleStyle(isLight)}>Use predictable names in /public like network-inri.png, token-iusd.png, wallet-ledger.png. The wallet will follow the registry first and fallback second.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <label style={ghostButton(isLight)}>
            Upload preview file
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} />
          </label>
          <button onClick={() => { resetAssetRegistry(); refresh("Asset registry reset"); }} style={ghostButton(isLight)}>Reset registry</button>
        </div>
      </section>
    </div>
  );
}

function renderBlock(
  kind: "network" | "token" | "dapp" | "wallet",
  title: string,
  draft: RegistryDraft,
  setDraft: React.Dispatch<React.SetStateAction<RegistryDraft>>,
  isLight: boolean,
  saveEntry: (kind: "network" | "token" | "dapp" | "wallet") => void,
  handleSuggestedPath: (kind: "network" | "token" | "dapp" | "wallet", rawKey: string) => void,
  previewSrc: string,
  entries: Array<{ key: string; path: string; updatedAt: number }>,
) {
  const keyField = `${kind}Key` as const;
  const pathField = `${kind}Path` as const;

  return (
    <section style={cardStyle(isLight)}>
      <div style={sectionTitleStyle(isLight)}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
        <LogoImage src={previewSrc} alt={title} kind={kind} label={draft[keyField] || title} size={72} />
        <div style={{ display: "grid", gap: 10 }}>
          <input value={draft[keyField]} onChange={(e) => setDraft((prev) => ({ ...prev, [keyField]: e.target.value }))} placeholder={`${title} key`} style={inputStyle(isLight)} />
          <input value={draft[pathField]} onChange={(e) => setDraft((prev) => ({ ...prev, [pathField]: e.target.value }))} placeholder="Public path or URL" style={inputStyle(isLight)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => handleSuggestedPath(kind, draft[keyField])} style={ghostButton(isLight)}>Suggest /public path</button>
            <button onClick={() => saveEntry(kind)} style={primaryButtonStyle()}>Save {title.toLowerCase()}</button>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {entries.map((entry) => (
          <div key={`${kind}-${entry.key}`} style={rowStyle(isLight)}>
            <div>
              <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{entry.key}</div>
              <div style={subtitleStyle(isLight)}>{entry.path}</div>
            </div>
            <LogoImage src={entry.path} alt={entry.key} kind={kind} label={entry.key} size={36} />
          </div>
        ))}
        {entries.length === 0 ? <div style={subtitleStyle(isLight)}>No custom {title.toLowerCase()} entries yet.</div> : null}
      </div>
    </section>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 }; }
function titleStyle(isLight: boolean): React.CSSProperties { return { fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }; }
function sectionTitleStyle(isLight: boolean): React.CSSProperties { return { fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", marginBottom: 12 }; }
function subtitleStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13 }; }
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0d1420", color: isLight ? "#10131a" : "#ffffff", boxSizing: "border-box" }; }
function primaryButtonStyle(): React.CSSProperties { return { padding: "12px 14px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function ghostButton(isLight: boolean): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1520", color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }; }
function rowStyle(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`, background: isLight ? "#f8fbff" : "#0f1520" }; }
