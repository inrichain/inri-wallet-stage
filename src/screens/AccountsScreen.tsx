import React, { useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";

const VAULTS_KEY = "inri_wallet_vaults_v2";
const CURRENT_WALLET_KEY = "inri_wallet_current_id";

type WalletVault = {
  id: string;
  name: string;
  address: string;
  encryptedJson: string;
  createdAt: number;
};

function readVaults(): WalletVault[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(VAULTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVaults(items: WalletVault[]) {
  localStorage.setItem(VAULTS_KEY, JSON.stringify(items));
}

export default function AccountsScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const [wallets, setWallets] = useState<WalletVault[]>(() => readVaults());
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const currentId = localStorage.getItem(CURRENT_WALLET_KEY) || "";
  const total = useMemo(() => wallets.length, [wallets]);

  function startRename(item: WalletVault) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function saveRename() {
    if (!editingId || !editingName.trim()) return;
    const updated = wallets.map((item) => item.id === editingId ? { ...item, name: editingName.trim() } : item);
    setWallets(updated);
    writeVaults(updated);
    setEditingId("");
    setEditingName("");
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Accounts" subtitle="Multi-account shell ready. Rename and organize locally now, add secure exports later." theme={theme} actions={<StatusPill theme={theme} tone="primary">{total} total</StatusPill>} />
        {editingId ? (
          <div className="wallet-action-row" style={{ alignItems: "stretch" }}>
            <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="wallet-ui-input" placeholder="Account name" style={{ flex: 1 }} />
            <ActionButton theme={theme} onClick={saveRename}>Save</ActionButton>
            <ActionButton theme={theme} tone="ghost" onClick={() => { setEditingId(""); setEditingName(""); }}>Cancel</ActionButton>
          </div>
        ) : null}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="Local vaults" subtitle="These accounts are already inside the wallet vault. Later you can attach secure export and advanced account tools." theme={theme} compact />
        {!wallets.length ? (
          <EmptyState theme={theme} title="No accounts found" description="Create or import a wallet first. This screen is already wired for account management." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {wallets.map((item) => (
              <div key={item.id} className="wallet-list-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{item.name}</div>
                    {item.id === currentId ? <StatusPill theme={theme} tone="success">Current</StatusPill> : null}
                  </div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4, wordBreak: "break-all" }}>{item.address}</div>
                </div>
                <div className="wallet-action-row" style={{ gap: 8 }}>
                  <ActionButton theme={theme} tone="ghost" compact onClick={() => startRename(item)}>Rename</ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>
    </div>
  );
}
