import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionIdRef = useRef(`wc-qr-reader-${Math.random().toString(36).slice(2)}`);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function startScanner() {
      try {
        setError("");

        const scanner = new Html5Qrcode(regionIdRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (cancelled) return;

            if (decodedText?.startsWith("wc:")) {
              try {
                await stopScanner();
              } catch {}
              onScan(decodedText);
            }
          },
          () => {}
        );
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Could not open camera");
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open]);

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }
    } catch {}
    scannerRef.current = null;
  }

  async function handleClose() {
    await stopScanner();
    onClose();
  }

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div
        style={{
          width: "min(560px, calc(100vw - 24px))",
          background: theme === "light" ? "#ffffff" : "#111722",
          color: theme === "light" ? "#10131a" : "#ffffff",
          border: `1px solid ${theme === "light" ? "#d9e1ef" : "#273042"}`,
          borderRadius: 24,
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Scan WalletConnect QR
        </div>

        <div
          style={{
            color: theme === "light" ? "#5f6b7d" : "#9aa4b5",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Point your camera at a WalletConnect QR code. When a valid <strong>wc:</strong> URI
          is detected, it will be inserted automatically.
        </div>

        <div
          id={regionIdRef.current}
          style={{
            width: "100%",
            minHeight: 280,
            borderRadius: 16,
            overflow: "hidden",
            background: theme === "light" ? "#f4f7fb" : "#0a0f18",
          }}
        />

        {error ? (
          <div
            style={{
              marginTop: 12,
              color: "#ff6b6b",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={secondaryBtn(theme)} onClick={handleClose}>
            Close
          </button>
        </div>
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

function secondaryBtn(theme: "dark" | "light"): React.CSSProperties {
  return {
    flex: 1,
    height: 46,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#d3dceb" : "#2c3950"}`,
    background: "transparent",
    color: theme === "light" ? "#10131a" : "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}
