import React from "react";
import { getActiveNetwork } from "../lib/networks";

export default function ActivityScreen({
  lang = "en",
}: {
  lang?: string;
}) {
  const network = getActiveNetwork();
  const t = getText(lang);

  const rows = [
    { type: t.received, asset: network.symbol, amount: "+0.050000", status: t.confirmed },
    { type: t.sent, asset: network.symbol, amount: "-0.010000", status: t.confirmed },
    { type: t.swap, asset: "iUSD", amount: "+12.500000", status: t.preview },
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={panel()}>
        <div style={title()}>{t.title}</div>
        <div style={subtitle()}>{network.name}</div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {rows.map((row, idx) => (
          <div key={idx} style={rowCard()}>
            <div>
              <div style={rowTitle()}>{row.type}</div>
              <div style={rowSub()}>{row.asset}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={rowValue()}>{row.amount}</div>
              <div style={rowStatus()}>{row.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: { title: "Activity", received: "Received", sent: "Sent", swap: "Swap", confirmed: "Confirmed", preview: "Preview" },
    pt: { title: "Atividade", received: "Recebido", sent: "Enviado", swap: "Swap", confirmed: "Confirmado", preview: "Prévia" },
  };
  return map[lang] || map.en;
}

function panel(): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 18,
    background:
      "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
    border: "1px solid rgba(79,116,201,.18)",
    boxShadow: "0 16px 36px rgba(0,0,0,.24)",
  };
}
function title(): React.CSSProperties {
  return { color: "#fff", fontSize: 22, fontWeight: 900 };
}
function subtitle(): React.CSSProperties {
  return { color: "#91a5cc", fontSize: 13, fontWeight: 700, marginTop: 6 };
}
function rowCard(): React.CSSProperties {
  return {
    borderRadius: 20,
    padding: 16,
    background:
      "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
    border: "1px solid rgba(79,116,201,.18)",
    boxShadow: "0 12px 28px rgba(0,0,0,.20)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  };
}
function rowTitle(): React.CSSProperties {
  return { color: "#fff", fontSize: 15, fontWeight: 900 };
}
function rowSub(): React.CSSProperties {
  return { color: "#8ea1c7", fontSize: 12, fontWeight: 700, marginTop: 5 };
}
function rowValue(): React.CSSProperties {
  return { color: "#fff", fontSize: 15, fontWeight: 900 };
}
function rowStatus(): React.CSSProperties {
  return { color: "#80a6ff", fontSize: 12, fontWeight: 800, marginTop: 5 };
}
