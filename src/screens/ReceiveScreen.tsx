import React, { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";

const INRI_LOGO = "/brand-inri.png";

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

  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanResult, setScanResult] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      alert(t.copied);
    } catch {
      alert(t.copyFail);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setScanning(false);
  }

  async function openCameraQr() {
    setCameraError("");
    setScanResult("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        fileRef.current?.click();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }, 50);

      if ("BarcodeDetector" in window && typeof (window as any).BarcodeDetector === "function") {
        setScanning(true);
        startLiveQrScan();
      }
    } catch {
      fileRef.current?.click();
    }
  }

  async function startLiveQrScan() {
    try {
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !cameraOpen) return;

        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.length) {
            const value = String(codes[0].rawValue || "");
            if (value) {
              setScanResult(value);
              stopCamera();
              return;
            }
          }
        } catch {}

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    } catch {
      setScanning(false);
    }
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (
        "BarcodeDetector" in window &&
        typeof (window as any).BarcodeDetector === "function"
      ) {
        const imageBitmap = await createImageBitmap(file);
        const Detector = (window as any).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        const codes = await detector.detect(imageBitmap);

        if (codes?.length) {
          setScanResult(String(codes[0].rawValue || ""));
        } else {
          alert(t.noQrFound);
        }
      } else {
        alert(t.cameraNotSupported);
      }
    } catch {
      alert(t.cameraFail);
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

      <div
        style={{
          display: "grid",
          placeItems: "center",
          margin: "24px 0",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 16,
            borderRadius: 20,
            maxWidth: "100%",
          }}
        >
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
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 14,
        }}
      >
        <button
          onClick={copyAddress}
          style={mainBtn}
        >
          {t.copyAddress}
        </button>

        <button
          onClick={openCameraQr}
          style={{
            ...ghostBtn(isLight),
          }}
        >
          {cameraOpen ? t.cameraOpened : t.scanQr}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
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

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <button onClick={stopCamera} style={ghostBtn(isLight)}>
              {t.closeCamera}
            </button>
            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, alignSelf: "center" }}>
              {scanning ? t.scanning : t.cameraReady}
            </div>
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
      scanQr: "Open Camera",
      cameraOpened: "Camera Open",
      closeCamera: "Close Camera",
      scanning: "Reading QR...",
      cameraReady: "Point the camera at a QR code.",
      lastScan: "Last scanned QR",
      noScanYet: "No QR scanned yet.",
      copied: "Address copied.",
      copyFail: "Could not copy address.",
      cameraFail: "Could not read the QR code.",
      cameraNotSupported: "This browser does not support QR reading yet.",
      noQrFound: "No QR code was found in the image.",
    },
    pt: {
      receive: "Receber",
      receiveHint: "Endereço da carteira e código QR",
      copyAddress: "Copiar Endereço",
      scanQr: "Abrir Câmera",
      cameraOpened: "Câmera Aberta",
      closeCamera: "Fechar Câmera",
      scanning: "Lendo QR...",
      cameraReady: "Aponte a câmera para um QR code.",
      lastScan: "Último QR lido",
      noScanYet: "Nenhum QR lido ainda.",
      copied: "Endereço copiado.",
      copyFail: "Não foi possível copiar o endereço.",
      cameraFail: "Não foi possível ler o QR code.",
      cameraNotSupported: "Este navegador ainda não suporta leitura de QR.",
      noQrFound: "Nenhum QR code foi encontrado na imagem.",
    },
  };

  return map[lang] || map.en;
}
