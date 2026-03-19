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

export default function WalletConnectQrScanner({
  open,
  theme,
  lang = "en",
  onClose,
  onScan,
}: Props) {
  const isLight = theme === "light";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef(false);
  const handledRef = useRef(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedText, setScannedText] = useState("");
  const t = (key: string) => tr(lang, key);

  useEffect(() => {
    if (!open) return;
    handledRef.current = false;
    readerRef.current = new BrowserMultiFormatReader();
    void openCamera();

    const cleanup = () => {
      try {
        (readerRef.current as any)?.reset?.();
      } catch {}
      stopCameraTracks();
      scanningRef.current = false;
    };

    const handleVisibility = () => {
      if (document.hidden) cleanup();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", cleanup);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", cleanup);
      cleanup();
    };
  }, [open]);

  function stopCameraTracks() {
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
  }

  function findBackCamera(devices: MediaDeviceInfo[]) {
    const patterns = /back|rear|environment|traseira|traseiro/gi;
    return devices.find((d) => patterns.test(`${d.label} ${d.deviceId}`));
  }

  async function startDecodeWithConstraints(constraints: MediaStreamConstraints) {
    if (!readerRef.current || !videoRef.current || scanningRef.current) return;
    scanningRef.current = true;
    await readerRef.current.decodeFromConstraints(constraints, videoRef.current, (result) => {
      if (!result || handledRef.current) return;
      const text = result.getText()?.trim() || "";
      setScannedText(text);
      if (text.startsWith("wc:")) {
        handledRef.current = true;
        handleClose(false);
        onScan(text);
      }
    });
  }

  async function openCamera() {
    setCameraError("");
    setScannedText("");
    stopCameraTracks();
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!videoRef.current || !readerRef.current) {
        setCameraError(t("scanner_camera_unavailable"));
        return;
      }
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera = findBackCamera(devices);
      if (backCamera?.deviceId) {
        try {
          await startDecodeWithConstraints({
            audio: false,
            video: { deviceId: { exact: backCamera.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          return;
        } catch (err) {
          console.warn("Back camera by deviceId failed, trying environment mode", err);
          scanningRef.current = false;
        }
      }
      try {
        await startDecodeWithConstraints({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        return;
      } catch (err) {
        console.warn("Environment camera failed, trying any camera", err);
        scanningRef.current = false;
      }
      await startDecodeWithConstraints({ audio: false, video: true });
    } catch (err: any) {
      console.error(err);
      scanningRef.current = false;
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
      if (text.startsWith("wc:")) {
        URL.revokeObjectURL(url);
        handleClose(false);
        onScan(text);
        return;
      }
      URL.revokeObjectURL(url);
      setCameraError(t("scanner_not_walletconnect"));
    } catch {
      setCameraError(t("scanner_no_valid_qr"));
    } finally {
      event.target.value = "";
    }
  }

  function handleClose(callOnClose = true) {
    try {
      (readerRef.current as any)?.reset?.();
    } catch {}
    stopCameraTracks();
    scanningRef.current = false;
    if (callOnClose) onClose();
  }

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div
        style={{
          width: "min(560px, calc(100vw - 20px))",
          maxHeight: "min(92dvh, 760px)",
          overflowY: "auto",
          background: isLight ? "#ffffff" : "#111722",
          color: isLight ? "#10131a" : "#ffffff",
          border: `1px solid ${isLight ? "#d9e1ef" : "#273042"}`,
          borderRadius: 24,
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{t("scanner_title")}</div>
          <button onClick={() => handleClose()} style={ghostBtn(isLight)}>✕</button>
        </div>
        <div style={{ color: isLight ? "#5f6b7d" : "#9aa4b5", marginBottom: 14, lineHeight: 1.5 }}>{t("scanner_hint")}</div>
        <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: "#000" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: 360, minHeight: 240, objectFit: "cover", background: "#000" }} />
        </div>
        {cameraError ? <div style={{ marginTop: 12, color: "#ff7a7a", fontSize: 13 }}>{cameraError}</div> : null}
        {scannedText ? <div style={{ marginTop: 10, color: isLight ? "#5f6b7d" : "#9aa4b5", fontSize: 12, wordBreak: "break-all" }}>{scannedText}</div> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          <button onClick={() => void openCamera()} style={primaryBtn()}>{t("settings_walletconnect_scan_qr")}</button>
          <button onClick={() => fileRef.current?.click()} style={secondaryBtn(isLight)}>{t("scanner_pick_image") || "Pick image"}</button>
          <button onClick={() => handleClose()} style={secondaryBtn(isLight)}>{t("wc_request_reject") || "Close"}</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
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
  zIndex: 9999,
  padding: 10,
};

function primaryBtn(): React.CSSProperties {
  return { padding: "12px 16px", borderRadius: 12, border: "none", background: "#3f7cff", color: "#fff", cursor: "pointer", fontWeight: 800 };
}
function secondaryBtn(isLight: boolean): React.CSSProperties {
  return { padding: "12px 16px", borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#fff" : "#1b2741", color: isLight ? "#10131a" : "#fff", cursor: "pointer", fontWeight: 700 };
}
function ghostBtn(isLight: boolean): React.CSSProperties {
  return { width: 40, height: 40, borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#fff" : "#1b2741", color: isLight ? "#10131a" : "#fff", cursor: "pointer", fontWeight: 700 };
}
