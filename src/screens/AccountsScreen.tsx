import React, { useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import { decryptWallet, loadWallets, saveWallets } from "../lib/security";

export default function AccountsScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const [wallets, setWallets] = useState(() => loadWallets());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const total = wallets.length;
  const unlockedCapable = useMemo(() => wallets.filter((w) => !!w.ciphertext).length, [wallets]);
  function beginEdit(id: string, name: string) { setEditingId(id); setDraft(name); }
  function saveName(id: string) {
    const next = wallets.map((w) => w.id === id ? { ...w, name: draft.trim() || w.name } : w);
    setWallets(next); saveWallets(next); setEditingId(null); setDraft("");
  }
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Accounts" subtitle="Manage local wallets before export and advanced tooling are connected." theme={theme} />
        <div className="wallet-action-row"><StatusPill theme={theme} tone="primary">{total} wallets</StatusPill><StatusPill theme={theme}>{unlockedCapable.length} encrypted</StatusPill></div>
      </ScreenCard>
      <ScreenCard theme={theme}>
        {wallets.map((w, idx) => (
          <div key={w.id} style={{ padding: "14px 0", borderBottom: idx === wallets.length - 1 ? "none" : `1px solid ${theme === "light" ? "#e8edf5" : "#1b2230"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                {editingId === w.id ? <input value={draft} onChange={(e) => setDraft(e.target.value)} className="wallet-input" /> : <div style={{ fontWeight: 900 }}>{w.name}</div>}
                <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{w.address}</div>
              </div>
              {editingId === w.id ? <button className="wallet-btn primary" onClick={() => saveName(w.id)}>Save</button> : <button className="wallet-btn secondary" onClick={() => beginEdit(w.id, w.name)}>Rename</button>}
            </div>
          </div>
        ))}
      </ScreenCard>
    </div>
  );
}
