import React, { useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";

const KEY = "inri_wallet_contacts_v1";
type Contact = { id: string; name: string; address: string; network: string; note: string; favorite: boolean };
function loadContacts(): Contact[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch { return []; } }
function saveContacts(items: Contact[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

export default function ContactsScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const [items, setItems] = useState<Contact[]>(() => loadContacts());
  const [form, setForm] = useState({ name: "", address: "", network: "INRI", note: "" });
  const favorites = useMemo(() => items.filter((i) => i.favorite).length, [items]);
  function add() {
    if (!form.name.trim() || !form.address.trim()) return;
    const next = [{ id: crypto.randomUUID(), ...form, favorite: false }, ...items];
    setItems(next); saveContacts(next); setForm({ name: "", address: "", network: "INRI", note: "" });
  }
  function toggleFav(id: string) { const next = items.map((i) => i.id === id ? { ...i, favorite: !i.favorite } : i); setItems(next); saveContacts(next); }
  function remove(id: string) { const next = items.filter((i) => i.id !== id); setItems(next); saveContacts(next); }
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}><SectionTitle title="Contacts" subtitle="Address book ready for send, bridge destinations and future quick actions." theme={theme} /><div className="wallet-action-row"><StatusPill theme={theme} tone="primary">{items.length} saved</StatusPill><StatusPill theme={theme}>{favorites} favorites</StatusPill></div></ScreenCard>
      <ScreenCard theme={theme}>
        <div className="wallet-form-grid-2"><input className="wallet-input" placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/><input className="wallet-input" placeholder="Network" value={form.network} onChange={(e)=>setForm({...form,network:e.target.value})}/></div>
        <input className="wallet-input" style={{marginTop:12}} placeholder="Address" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/>
        <textarea className="wallet-input" style={{marginTop:12,minHeight:92}} placeholder="Note" value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})}/>
        <div className="wallet-action-row" style={{marginTop:12}}><button className="wallet-btn primary" onClick={add}>Add contact</button></div>
      </ScreenCard>
      <ScreenCard theme={theme}>
        {items.length === 0 ? <div className="wallet-empty-state"><div className="wallet-empty-state-title">No contacts yet</div><div className="wallet-empty-state-text">Add trusted addresses here to make sending and bridge destinations easier later.</div></div> : items.map((c, idx) => <div key={c.id} style={{padding:'14px 0', borderBottom: idx===items.length-1?'none':`1px solid ${theme==='light'?'#e8edf5':'#1b2230'}`}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div style={{minWidth:0}}><div style={{fontWeight:900}}>{c.name}</div><div className="wallet-ui-subtle" style={{marginTop:4}}>{c.address}</div><div className="wallet-ui-subtle" style={{marginTop:4}}>{c.network}{c.note ? ` • ${c.note}` : ''}</div></div><div style={{display:'flex',gap:8}}><button className="wallet-btn secondary" onClick={()=>toggleFav(c.id)}>{c.favorite?'★':'☆'}</button><button className="wallet-btn secondary" onClick={()=>remove(c.id)}>Remove</button></div></div></div>)}
      </ScreenCard>
    </div>
  );
}
