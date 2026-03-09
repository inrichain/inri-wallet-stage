import React, { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";

const INRI_LOGO = "/favicon.png";

export default function ReceiveScreen({
  theme = "dark",
  lang = "en",
  address,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [scanResult, setScanResult] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      try {
        readerRef.current?.reset();
      } catch {}
    };
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      alert(t.copied);
    } catch {
      alert(t.copyFail);
    }
  }

  async function openCameraQr() {
    setCameraError("");
    setScanResult("");

    try {
      setCameraOpen(true);

      setTimeout(async () => {
        try {
          if (!videoRef.current || !readerRef.current) return;

          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          const backCamera =
            devices.find((d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
            ) || devices[0];

          if (!backCamera) {
            setCameraError(t.noCamera);
            setCameraOpen(false);
            return;
          }

          const result = await readerRef.current.decodeOnceFromVideoDevice(
            backCamera.deviceId,
            videoRef.current
          );

          if (result?.getText()) {
            setScanResult(result.getText());
          }

          closeCamera();
        } catch {
          setCameraError(t.cameraFail);
        }
      }, 150);
    } catch {
      setCameraError(t.cameraFail);
      setCameraOpen(false);
    }
  }

  function closeCamera() {
    try {
      readerRef.current?.reset();
    } catch {}
    setCameraOpen(false);
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !readerRef.current) return;

    try {
      const url = URL.createObjectURL(file);
      const result = await readerRef.current.decodeFromImageUrl(url);
      if (result?.getText()) {
        setScanResult(result.getText());
      } else {
        alert(t.noQrFound);
      }
      URL.revokeObjectURL(url);
    } catch {
      alert(t.noQrFound);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: isLight ? "#ffffff" : "#121621",
        padding: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img
          src={INRI_LOGO}
          alt="INRI"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          style={{
            width: 42,
            height: 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        <div>
          <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>{t.receive}</h2>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>
            {t.receiveHint}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", placeItems: "center", margin: "24px 0" }}>
        <div style={{ background: "#fff", padding: 16, borderRadius: 20, maxWidth: "100%" }}>
          <QRCode value={address || "0x"} size={190} />
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          background: isLight ? "#f8fafc" : "#0f1522",
          color: isLight ? "#334155" : "#cdd6ea",
          wordBreak: "break-all",
          overflowWrap: "anywhere",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {address}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginTop: 14,
        }}
      >
        <button onClick={copyAddress} style={mainBtn}>
          {t.copyAddress}
        </button>

        <button onClick={openCameraQr} style={ghostBtn(isLight)}>
          {t.openCamera}
        </button>

        <button onClick={() => fileRef.current?.click()} style={ghostBtn(isLight)}>
          {t.imageScan}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPickImage}
        style={{ display: "none" }}
      />

      {cameraOpen && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: "#000",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                display: "block",
                maxHeight: 360,
                objectFit: "cover",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={closeCamera} style={ghostBtn(isLight)}>
              {t.closeCamera}
            </button>
          </div>
        </div>
      )}

      {cameraError ? (
        <div style={{ marginTop: 12, color: "#ef4444", fontSize: 13 }}>{cameraError}</div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            marginBottom: 8,
            color: isLight ? "#5b6578" : "#97a0b3",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {t.lastScan}
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
            background: isLight ? "#f8fafc" : "#0f1522",
            color: isLight ? "#334155" : "#cdd6ea",
            minHeight: 52,
            wordBreak: "break-all",
            overflowWrap: "anywhere",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {scanResult || t.noScanYet}
        </div>
      </div>
    </div>
  );
}

const mainBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "none",
  background: "#3f7cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 15,
};

function ghostBtn(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#12192a",
    color: isLight ? "#10131a" : "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
  };
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      receive: "Receive",
      receiveHint: "Wallet address and QR code",
      copyAddress: "Copy Address",
      openCamera: "Open Camera",
      closeCamera: "Close Camera",
      imageScan: "Image QR",
      lastScan: "Last scanned QR",
      noScanYet: "No QR scanned yet.",
      copied: "Address copied.",
      copyFail: "Could not copy address.",
      noQrFound: "No QR code was found in the image.",
      noCamera: "No camera found on this device.",
      cameraFail: "Could not open or read the camera.",
    },
    pt: {
      receive: "Receber",
      receiveHint: "Endereço da carteira e código QR",
      copyAddress: "Copiar Endereço",
      openCamera: "Abrir Câmera",
      closeCamera: "Fechar Câmera",
      imageScan: "QR da Imagem",
      lastScan: "Último QR lido",
      noScanYet: "Nenhum QR lido ainda.",
      copied: "Endereço copiado.",
      copyFail: "Não foi possível copiar o endereço.",
      noQrFound: "Nenhum QR code foi encontrado na imagem.",
      noCamera: "Nenhuma câmera foi encontrada neste aparelho.",
      cameraFail: "Não foi possível abrir ou ler a câmera.",
    },
  };

  return map[lang] || map.en;
}
