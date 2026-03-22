import React, { useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";

const KEY = "inri_wallet_contacts_v1";

type ContactItem = {
  id: string;
  name: string;
  address: string;
  networkKey: string;
  note?: string;
  favorite?: boolean;
  createdAt: number;
};

function readContacts(): ContactItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeContacts(items: ContactItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export default function ContactsScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const isLight = theme === "light";
  const [items, setItems] = useState<ContactItem[]>(() => readContacts());
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [networkKey, setNetworkKey] = useState("inri");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.name, item.address, item.networkKey, item.note || ""].join(" ").toLowerCase().includes(q);
  }), [items, query]);

  function save() {
    if (!name.trim() || !address.trim()) return;
    const next: ContactItem = {
      id: `contact-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      networkKey: networkKey.trim() || "inri",
      note: note.trim(),
      favorite: false,
      createdAt: Date.now(),
    };
    const updated = [next, ...items];
    setItems(updated);
    writeContacts(updated);
    setName("");
    setAddress("");
    setNote("");
  }

  function remove(id: string) {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    writeContacts(updated);
  }

  function toggleFavorite(id: string) {
    const updated = items.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item);
    setItems(updated);
    writeContacts(updated);
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Contacts" subtitle="Save trusted addresses now and connect real flows later." theme={theme} actions={<StatusPill theme={theme} tone="primary">Ready</StatusPill>} />
        <div className="wallet-form-grid two-col">
          <input value={name} onChange={(e) => setName(e.target.value)} className="wallet-ui-input" placeholder="Contact name" />
          <input value={networkKey} onChange={(e) => setNetworkKey(e.target.value)} className="wallet-ui-input" placeholder="Network key" />
        </div>
        <div style={{ height: 10 }} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="wallet-ui-input" placeholder="Wallet address" />
        <div style={{ height: 10 }} />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="wallet-ui-textarea" placeholder="Private note" />
        <div className="wallet-action-row" style={{ marginTop: 12 }}>
          <ActionButton theme={theme} onClick={save}>Save contact</ActionButton>
          <ActionButton theme={theme} tone="ghost" onClick={() => { setName(""); setAddress(""); setNote(""); }}>Clear</ActionButton>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="Address book" subtitle="Use these contacts later in Send, Bridge and P2P flows." theme={theme} compact />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="wallet-ui-input" placeholder="Search contacts" />
        <div style={{ height: 10 }} />
        {!filtered.length ? (
          <EmptyState theme={theme} title="No contacts yet" description="Create your first address book entry to make the wallet feel complete before smart contract hooks land." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((item) => (
              <div key={item.id} className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{item.name}</div>
                    {item.favorite ? <StatusPill theme={theme} tone="success">Favorite</StatusPill> : null}
                    <StatusPill theme={theme}>{item.networkKey}</StatusPill>
                  </div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4, wordBreak: "break-all" }}>{item.address}</div>
                  {item.note ? <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>{item.note}</div> : null}
                </div>
                <div className="wallet-action-row" style={{ gap: 8, justifyContent: "flex-end" }}>
                  <ActionButton theme={theme} tone="ghost" compact onClick={() => toggleFavorite(item.id)}>{item.favorite ? "Unfavorite" : "Favorite"}</ActionButton>
                  <ActionButton theme={theme} tone="danger" compact onClick={() => remove(item.id)}>Remove</ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>
    </div>
  );
}
