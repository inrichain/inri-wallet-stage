import React, { useMemo, useState } from "react";
import { DEFAULT_NETWORK_ID, getBridgeTargets, getNetworkById } from "../lib/networks";
import { getDefaultTokens } from "../lib/inri";

export default function BridgeScreen({ theme, lang, address, activeNetworkId = DEFAULT_NETWORK_ID }: { theme: "dark" | "light"; lang: string; address: string; activeNetworkId?: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const fromNetwork = getNetworkById(activeNetworkId);
  const targets = useMemo(() => getBridgeTargets(fromNetwork.id), [fromNetwork.id]);
  const [toNetworkId, setToNetworkId] = useState(targets[0]?.id || "polygon");
  const [amount, setAmount] = useState("");
  const tokens = getDefaultTokens(fromNetwork.id).filter((tkn) => ["iUSD", "DNR", fromNetwork.nativeCurrency.symbol, fromNetwork.nativeSymbol].includes(tkn.symbol));
  const [tokenIndex, setTokenIndex] = useState(0);
  const toNetwork = getNetworkById(toNetworkId);
  const token = tokens[tokenIndex] || tokens[0];
  const fee = Number(amount || 0) > 0 ? (Number(amount || 0) * 0.002).toFixed(4) : "0";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(isLight)}>
        <div style={title(isLight)}>{t.bridge}</div>
        <div style={sub(isLight)}>{t.subtitle}</div>
      </section>

      <section style={panel(isLight)}>
        <div style={{ display: "grid", gap: 12 }}>
          <NetBox isLight={isLight} label={t.from} network={fromNetwork} />
          <div style={{ display: "flex", justifyContent: "center" }}><button style={flipBtn(isLight)}>⇅</button></div>
          <div>
            <div style={label(isLight)}>{t.to}</div>
            <select value={toNetworkId} onChange={(e) => setToNetworkId(e.target.value)} style={input(isLight)}>
              {targets.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}
            </select>
          </div>
          <div>
            <div style={label(isLight)}>{t.asset}</div>
            <select value={tokenIndex} onChange={(e) => setTokenIndex(Number(e.target.value))} style={input(isLight)}>
              {tokens.map((item, idx) => <option key={idx} value={idx}>{item.symbol}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={token?.logo} alt={token?.symbol} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 12, background: isLight ? "#f8fbff" : "#0c1422", padding: 5 }} />
            <div style={{ color: isLight ? "#09111f" : "#fff", fontWeight: 900 }}>{token?.symbol} • {token?.name}</div>
          </div>
          <div>
            <div style={label(isLight)}>{t.amount}</div>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={input(isLight)} />
          </div>
        </div>
      </section>

      <section style={panel(isLight)}>
        <Row isLight={isLight} label={t.route} value={`${fromNetwork.name} → ${toNetwork.name}`} />
        <Row isLight={isLight} label={t.protocolFee} value={`${fee} (${t.feeRate})`} />
        <Row isLight={isLight} label={t.address} value={address || "-"} mono />
        <button style={primary}>{t.comingSoon}</button>
      </section>
    </div>
  );
}

function NetBox({ isLight, label, network }: any) { return <div><div style={labelStyle(isLight)}>{label}</div><div style={{ border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 18, padding: 14, background: isLight ? "#f8fbff" : "#0c1422", display: "flex", alignItems: "center", gap: 10 }}><img src={network.icon} alt={network.name} style={{ width: 34, height: 34, objectFit: "contain" }} /><div><div style={{ color: isLight ? "#09111f" : "#fff", fontWeight: 900 }}>{network.name}</div><div style={{ color: isLight ? "#64748f" : "#90a3c7", fontSize: 12 }}>Chain ID {network.chainId}</div></div></div></div>; }
function Row({ isLight, label, value, mono }: any) { return <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "8px 0" }}><div style={{ color: isLight ? "#64748f" : "#90a3c7", fontWeight: 700, fontSize: 13 }}>{label}</div><div style={{ color: isLight ? "#09111f" : "#fff", fontWeight: 900, fontSize: 13, wordBreak: "break-all", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>{value}</div></div>; }
function getText(lang: string) { const map: Record<string, any> = { en: { bridge: "Bridge", subtitle: "Polygon ↔ INRI bridge preview with logos and fee preview.", from: "From", to: "To", asset: "Asset", amount: "Amount", route: "Route", protocolFee: "Protocol fee", feeRate: "0.20%", address: "Your address", comingSoon: "Bridge execution coming soon" }, pt: { bridge: "Bridge", subtitle: "Prévia do bridge Polygon ↔ INRI com logos e taxa.", from: "Origem", to: "Destino", asset: "Ativo", amount: "Quantidade", route: "Rota", protocolFee: "Taxa do protocolo", feeRate: "0,20%", address: "Seu endereço", comingSoon: "Execução do bridge em breve" } }; return map[lang] || map.en; }
function panel(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 24, background: isLight ? "#fff" : "#101827", padding: 18 }; }
function title(isLight: boolean): React.CSSProperties { return { color: isLight ? "#09111f" : "#fff", fontWeight: 900, fontSize: 18 }; }
function sub(isLight: boolean): React.CSSProperties { return { color: isLight ? "#64748f" : "#90a3c7", fontSize: 13, marginTop: 6 }; }
function label(isLight: boolean): React.CSSProperties { return { color: isLight ? "#64748f" : "#90a3c7", fontWeight: 800, fontSize: 12, marginBottom: 8 }; }
const labelStyle = label;
function input(isLight: boolean): React.CSSProperties { return { width: "100%", padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#101827", color: isLight ? "#09111f" : "#fff", boxSizing: "border-box" }; }
function flipBtn(isLight: boolean): React.CSSProperties { return { width: 46, height: 46, borderRadius: 999, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#101827", color: isLight ? "#09111f" : "#fff", fontWeight: 900 }; }
const primary: React.CSSProperties = { width: "100%", marginTop: 12, padding: "14px 16px", borderRadius: 16, border: "none", background: "linear-gradient(180deg,#26a6ff 0%, #4f7cff 100%)", color: "#fff", cursor: "pointer", fontWeight: 900 };
