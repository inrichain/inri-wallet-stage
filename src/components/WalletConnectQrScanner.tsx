import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  onClose: () => void;
  onScan: (value: string) => void;
};

export default function WalletConnectQrScanner({
  open,
  theme,
  onClose,
  onScan,
}: Props) {
  const isLight = theme === "light";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scannedText, setScannedText] = useState("");

  useEffect(() => {
    if (!open) return;

    readerRef.current = new BrowserMultiFormatReader();

    openCamera();

    return () => {
      try {
        (readerRef.current as any)?.reset?.();
      } catch {}
      stopCameraTracks();
    };
  }, [open]);

  function stopCameraTracks() {
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.srcObject = null;
    }
  }

  async function openCamera() {
    setCameraError("");
    setScannedText("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!videoRef.current || !readerRef.current) {
        setCameraError("Camera unavailable.");
        return;
      }

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera =
        devices.find((d) =>
          /back|rear|environment/gi.test(`${d.label} ${d.deviceId}`)
        ) || devices[0];

      if (!backCamera) {
        setCameraError("No camera found on this device.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: backCamera?.deviceId
          ? { deviceId: { exact: backCamera.deviceId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result) => {
          if (!result) return;

          const text = result.getText()?.trim() || "";
          setScannedText(text);

          if (text.startsWith("wc:")) {
            handleClose();
            onScan(text);
          }
        }
      );
    } catch (err: any) {
      console.error(err);
      setCameraError(err?.message || "Could not open camera.");
    }
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !readerRef.current) return;

    try {
      const url = URL.createObjectURL(file);
      const result = await readerRef.current.decodeFromImageUrl(url);
      const text = result?.getText()?.trim() || "";

      setScannedText(text);

      if (text.startsWith("wc:")) {
        URL.revokeObjectURL(url);
        handleClose();
        onScan(text);
        return;
      }

      URL.revokeObjectURL(url);
      setCameraError("This QR code does not contain a WalletConnect URI.");
    } catch {
      setCameraError("No valid WalletConnect QR code was found in the image.");
    } finally {
      event.target.value = "";
    }
  }

  function handleClose() {
    try {
      (readerRef.current as any)?.reset?.();
    } catch {}

    stopCameraTracks();
    onClose();
  }

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div
        style={{
          width: "min(560px, calc(100vw - 24px))",
          background: isLight ? "#ffffff" : "#111722",
          color: isLight ? "#10131a" : "#ffffff",
          border: `1px solid ${isLight ? "#d9e1ef" : "#273042"}`,
          borderRadius: 24,
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          Scan WalletConnect QR
        </div>

        <div
          style={{
            color: isLight ? "#5f6b7d" : "#9aa4b5",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Point your camera at a QR code containing a <strong>wc:</strong> WalletConnect URI.
        </div>

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

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} style={secondaryBtn(isLight)}>
            Scan from Image
          </button>

          <button onClick={handleClose} style={secondaryBtn(isLight)}>
            Close
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickImage}
          style={{ display: "none" }}
        />

        {cameraError ? (
          <div style={{ marginTop: 12, color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
            {cameraError}
          </div>
        ) : null}

        {scannedText ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: isLight ? "#f8fafc" : "#0f1522",
              color: isLight ? "#334155" : "#cdd6ea",
              wordBreak: "break-all",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {scannedText}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10001,
  padding: 12,
};

function secondaryBtn(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#1b2741",
    color: isLight ? "#10131a" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}
