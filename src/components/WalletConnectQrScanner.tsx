import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { tr } from "../i18n/translations";
import { decodeQrFromFile, ensureCameraAccess, isIosPwaStandalone, listVideoDevices, pickPreferredCamera, startQrDecode, stopVideoStream } from "../lib/camera";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  lang?: string;
  onClose: () => void;
  onScan: (value: string) => void | Promise<void>;
  connecting?: boolean;
};

export default function WalletConnectQrScanner({
  open,
  theme,
  lang = "en",
  onClose,
  onScan,
  connecting = false,
}: Props) {
  const isLight = theme === "light";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const openingRef = useRef(false);
  const scannedRef = useRef(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedText, setScannedText] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const t = (key: string) => tr(lang, key);

  useEffect(() => {
    if (!open) return;

    scannedRef.current = false;
    readerRef.current = new BrowserMultiFormatReader();
    if (isIosPwaStandalone()) {
      setCameraError(t("scanner_ios_capture_hint") || t("scanner_from_image"));
    } else {
      void prepareAndOpenCamera();
    }

    return () => {
      resetReader();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedDeviceId) return;
    void openCamera(selectedDeviceId);
  }, [open, selectedDeviceId]);

  function resetReader() {
    try {
      (readerRef.current as any)?.reset?.();
    } catch {}
    stopVideoStream(videoRef.current);
  }

  async function prepareAndOpenCamera() {
    try {
      setCameraError("");
      await ensureCameraAccess();

      const list = await listVideoDevices();
      setCameras(list);

      const preferred = pickPreferredCamera(list, selectedDeviceId)?.deviceId || "";
      if (preferred) setSelectedDeviceId(preferred);
      await openCamera(preferred || undefined);
    } catch (err: any) {
      console.error(err);
      setCameraError(t("scanner_could_not_open"));
    } finally {
      openingRef.current = false;
    }
  }

  async function openCamera(deviceId?: string) {
    if (openingRef.current || scannedRef.current) return;

    openingRef.current = true;
    setCameraError("");
    setScannedText("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!videoRef.current || !readerRef.current) {
        setCameraError(t("scanner_camera_unavailable"));
        return;
      }

      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.muted = true;

      await startQrDecode({
        reader: readerRef.current,
        video: videoRef.current,
        deviceId,
        onResult: (text) => {
          setScannedText(text);
          if (!text.startsWith("wc:")) return;
          scannedRef.current = true;
          handleClose();
          void onScan(text);
        },
      });
    } catch (err: any) {
      console.error(err);
      setCameraError(err?.message || t("scanner_could_not_open"));
    } finally {
      openingRef.current = false;
    }
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !readerRef.current) return;
    try {
      const text = (await decodeQrFromFile(file, readerRef.current)).trim();
      setScannedText(text);
      if (text.startsWith("wc:")) {
        handleClose();
        await onScan(text);
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
    resetReader();
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
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{t("scanner_title")}</div>
        <div style={{ color: isLight ? "#5f6b7d" : "#9aa4b5", marginBottom: 14, lineHeight: 1.5 }}>{t("scanner_hint")}</div>

        {cameras.length > 1 ? (
          <div style={{ marginBottom: 12 }}>
            <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} style={selectStyle(isLight)}>
              {cameras.map((camera, index) => (
                <option key={camera.deviceId || index} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: "#000" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "cover" }} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} style={secondaryBtn(isLight)} disabled={connecting}>{t("scanner_from_image")}</button>
          <button onClick={() => openCamera(selectedDeviceId)} style={secondaryBtn(isLight)} disabled={connecting}>{t("scanner_retry")}</button>
          <button onClick={handleClose} style={secondaryBtn(isLight)} disabled={connecting}>{t("scanner_close")}</button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickImage} style={{ display: "none" }} />

        {connecting ? <div style={{ marginTop: 12, color: "#3f7cff", fontSize: 13, fontWeight: 700 }}>Connecting WalletConnect...</div> : null}
        {cameraError ? <div style={{ marginTop: 12, color: isIosPwaStandalone() ? (isLight ? "#334155" : "#cdd6ea") : "#ef4444", fontSize: 13, fontWeight: 700 }}>{cameraError}</div> : null}
        {scannedText ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#f8fafc" : "#0f1522", color: isLight ? "#334155" : "#cdd6ea", wordBreak: "break-all", fontSize: 12, lineHeight: 1.5 }}>
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

function selectStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#2c3950"}`,
    background: isLight ? "#ffffff" : "#0f1624",
    color: isLight ? "#10131a" : "#ffffff",
    padding: "0 12px",
  };
}
