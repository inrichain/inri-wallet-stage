import React from "react";
import QRCode from "react-qr-code";
import { getReceiveUri } from "../lib/inri";
import { getActiveNetwork } from "../lib/networks";

export default function ReceiveScreen({
  address,
  lang = "en",
}: {
  address: string;
  lang?: string;
}) {
  const network = getActiveNetwork();
  const t = getText(lang);
  const uri = getReceiveUri(network.id, address);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={panel()}>
        <div style={title()}>{t.title}</div>
        <div style={subtitle()}>
          {network.name} • Chain ID {network.chainId}
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            justifyItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: 18,
              borderRadius: 22,
              boxShadow: "0 12px 28px rgba(0,0,0,.14)",
            }}
          >
            <QRCode value={uri || address || "INRI"} size={220} />
          </div>

          <div
            style={{
              width: "100%",
              borderRadius: 18,
              padding: 14,
              background: "rgba(12,20,36,.88)",
              border: "1px solid rgba(79,116,201,.18)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              wordBreak: "break-all",
              lineHeight: 1.55,
            }}
          >
            {address}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => navigator.clipboard.writeText(address || "")}
              style={mainBtn()}
            >
              {t.copy}
            </button>

            <button
              onClick={() => navigator.clipboard.writeText(uri || "")}
              style={secondaryBtn()}
            >
              {t.copyUri}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: { title: "Receive", copy: "Copy address", copyUri: "Copy URI" },
    pt: { title: "Receber", copy: "Copiar endereço", copyUri: "Copiar URI" },
    es: { title: "Recibir", copy: "Copiar dirección", copyUri: "Copiar URI" },
    fr: { title: "Recevoir", copy: "Copier l'adresse", copyUri: "Copier URI" },
    de: { title: "Empfangen", copy: "Adresse kopieren", copyUri: "URI kopieren" },
    ja: { title: "受取", copy: "アドレスをコピー", copyUri: "URIをコピー" },
    zh: { title: "接收", copy: "复制地址", copyUri: "复制 URI" },
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
function mainBtn(): React.CSSProperties {
  return {
    minWidth: 150,
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
