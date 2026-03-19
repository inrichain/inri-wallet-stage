import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { tr } from "../i18n/translations";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  lang?: string;
  onClose: () => void;
  onScan: (value: string) => void;
};

export default function WalletConnectQrScanner({ open, theme, lang = "en", onClose, onScan }: Props) {
  const isLight = theme === "light";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannedOnceRef = useRef(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedText, setScannedText] = useState("");
  const t = (key: string) => tr(lang, key);

  useEffect(() => {
    if (!open) return;
    scannedOnceRef.current = false;
    readerRef.current = new BrowserMultiFormatReader();
    void openCamera();

    const onHidden = () => {
      if (document.hidden) stopEverything();
    };
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      stopEverything();
    };
  }, [open]);

  function stopCameraTracks() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function stopEverything() {
    try {
      (readerRef.current as any)?.reset?.();
    } catch {}
    stopCameraTracks();
  }

  function findBackCamera(devices: MediaDeviceInfo[]) {
    const patterns = /back|rear|environment|traseira|traseiro/gi;
    return devices.find((d) => patterns.test(`${d.label} ${d.deviceId}`));
  }

  async function startDecodeWithConstraints(constraints: MediaStreamConstraints) {
    if (!readerRef.current || !videoRef.current) return;
    await readerRef.current.decodeFromConstraints(constraints, videoRef.current, (result) => {
      if (!result || scannedOnceRef.current) return;
      const text = result.getText()?.trim() || "";
      setScannedText(text);
      if (text.startsWith("wc:")) {
        scannedOnceRef.current = true;
        stopEverything();
        onClose();
        onScan(text);
      }
    });
  }

  async function openCamera() {
    setCameraError("");
    setScannedText("");
    stopEverything();

    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (!videoRef.current || !readerRef.current) return;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera = findBackCamera(devices);
      if (backCamera?.deviceId) {
        try {
          await startDecodeWithConstraints({ audio: false, video: { deviceId: { exact: backCamera.deviceId } } });
          return;
        } catch {}
      }
      try {
        await startDecodeWithConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } });
        return;
      } catch {}
      await startDecodeWithConstraints({ audio: false, video: true });
    } catch (err: any) {
      setCameraError(err?.message || t("scanner_could_not_open"));
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
      URL.revokeObjectURL(url);
      if (text.startsWith("wc:")) {
        stopEverything();
        onClose();
        onScan(text);
        return;
      }
      setCameraError(t("scanner_not_walletconnect"));
    } catch {
      setCameraError(t("scanner_no_valid_qr"));
    } finally {
      event.target.value = "";
    }
  }

  function handleClose() {
    stopEverything();
    onClose();
  }

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={{ width: "min(560px, calc(100vw - 24px))", background: isLight ? "#ffffff" : "#111722", color: isLight ? "#10131a" : "#ffffff", border: `1px solid ${isLight ? "#d9e1ef" : "#273042"}`, borderRadius: 24, padding: 18, boxSizing: "border-box" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{t("scanner_title")}</div>
        <div style={{ color: isLight ? "#5f6b7d" : "#9aa4b5", marginBottom: 14, lineHeight: 1.5 }}>{t("scanner_hint")}</div>
        <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: "#000" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} style={secondaryBtn(isLight)}>{t("scanner_from_image")}</button>
          <button onClick={() => void openCamera()} style={secondaryBtn(isLight)}>{t("scanner_retry")}</button>
          <button onClick={handleClose} style={secondaryBtn(isLight)}>{t("scanner_close")}</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
        {cameraError ? <div style={{ marginTop: 12, color: "#ef4444", fontSize: 13, fontWeight: 700 }}>{cameraError}</div> : null}
        {scannedText ? <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#f8fafc" : "#0f1522", fontSize: 12, wordBreak: "break-all" }}>{scannedText}</div> : null}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(2,6,23,.72)",
  display: "grid",
  placeItems: "center",
  padding: 12,
};

function secondaryBtn(isLight: boolean): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#2a3346"}`,
    background: isLight ? "#f8fafc" : "#121826",
    color: isLight ? "#0f172a" : "#e5e7eb",
    cursor: "pointer",
    fontWeight: 700,
  };
}
