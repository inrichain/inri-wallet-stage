import React, { useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { getActiveNetwork } from "../lib/networks";
import { getKnownTokens } from "../lib/inri";

export default function SendScreen({
  lang = "en",
}: {
  lang?: string;
}) {
  const network = getActiveNetwork();
  const t = getText(lang);
  const tokens = getKnownTokens(network.id);

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenIndex, setTokenIndex] = useState(0);

  async function scanQR() {
    try {
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeOnceFromVideoDevice(undefined, "qr-video-preview");
      setTo(result.getText());
    } catch (err) {
      console.error(err);
      alert(t.scanError);
    }
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={panel()}>
        <div style={title()}>{t.title}</div>
        <div style={subtitle()}>{network.name}</div>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <select
            value={tokenIndex}
            onChange={(e) => setTokenIndex(Number(e.target.value))}
            style={input()}
          >
            {tokens.map((token, idx) => (
              <option key={`${token.symbol}-${idx}`} value={idx}>
                {token.symbol} — {token.name}
              </option>
            ))}
          </select>

          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t.address}
            style={input()}
          />

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.amount}
            style={input()}
          />

          <div
            id="qr-video-preview"
            style={{
              display: "none",
            }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={scanQR} style={mainBtn()}>
              {t.scan}
            </button>

            <button
              onClick={() => alert(t.sendPreview)}
              style={secondaryBtn()}
            >
              {t.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      title: "Send",
      address: "Recipient address",
      amount: "Amount",
      scan: "Scan QR",
      send: "Send",
      scanError: "Could not scan QR code.",
      sendPreview: "Send preview ready. Real transaction wiring comes next.",
    },
    pt: {
      title: "Enviar",
      address: "Endereço do destinatário",
      amount: "Quantidade",
      scan: "Ler QR",
      send: "Enviar",
      scanError: "Não foi possível ler o QR code.",
      sendPreview: "Prévia de envio pronta. A transação real entra no próximo passo.",
    },
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
function input(): React.CSSProperties {
  return {
    width: "100%",
    height: 50,
    borderRadius: 16,
    border: "1px solid rgba(79,116,201,.18)",
    background: "rgba(12,20,36,.88)",
    color: "#fff",
    padding: "0 14px",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 700,
  };
}
function mainBtn(): React.CSSProperties {
  return {
    minWidth: 130,
    height: 46,
    padding: "0 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(180deg,#3478ff 0%, #245ef5 100%)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(52,120,255,.22)",
  };
}
function secondaryBtn(): React.CSSProperties {
  return {
    minWidth: 130,
    height: 46,
    padding: "0 18px",
    borderRadius: 16,
    border: "1px solid rgba(79,116,201,.18)",
    background: "rgba(12,20,36,.88)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}
