import React, { useState } from "react";
import QRCode from "react-qr-code";

type ReceiveScreenProps = {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
};

export default function ReceiveScreen({
  theme = "dark",
  lang = "en",
  address,
}: ReceiveScreenProps) {
  const isLight = theme === "light";
  const [message, setMessage] = useState("");
  const text = getText(lang);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setMessage(text.copied);
      setTimeout(() => setMessage(""), 2200);
    } catch {
      setMessage(text.copyFail);
      setTimeout(() => setMessage(""), 2200);
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: isLight ? "#ffffff" : "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, color: isLight ? "#10131a" : "#ffffff" }}>
        {text.receive}
      </h2>

      <div
        style={{
          width: 220,
          margin: "0 auto",
          borderRadius: 22,
          background: "#ffffff",
          padding: 16,
          display: "grid",
          placeItems: "center",
        }}
      >
        <QRCode value={address || "0x"} size={180} />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 14,
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          background: isLight ? "#f6f8fc" : "#0d111b",
          color: isLight ? "#4a5568" : "#97a0b3",
          wordBreak: "break-all",
          fontSize: 13,
        }}
      >
        {address}
      </div>

      <button
        onClick={copyAddress}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "#3f7cff",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 800,
        }}
      >
        {text.copyAddress}
      </button>

      {message ? (
        <div
          style={{
            marginTop: 10,
            color: "#3f7cff",
            fontSize: 13,
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      receive: "Receive",
      copyAddress: "Copy Address",
      copied: "Address copied.",
      copyFail: "Copy failed.",
    },
    pt: {
      receive: "Receber",
      copyAddress: "Copiar endereço",
      copied: "Endereço copiado.",
      copyFail: "Falha ao copiar.",
    },
    es: {
      receive: "Recibir",
      copyAddress: "Copiar dirección",
      copied: "Dirección copiada.",
      copyFail: "Error al copiar.",
    },
  };

  return map[lang] || map.en;
}
