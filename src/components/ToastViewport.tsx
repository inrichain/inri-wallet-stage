import React from "react";
import type { AppToastType } from "../lib/ui";

type ToastItem = {
  id: number;
  message: string;
  type: AppToastType;
};

export default function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div style={viewportStyle()}>
      {toasts.map((toast) => (
        <div key={toast.id} style={toastStyle(toast.type)}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", opacity: 0.9 }}>{labelFor(toast.type)}</div>
            <div style={{ fontWeight: 700, lineHeight: 1.45 }}>{toast.message}</div>
          </div>
          <button onClick={() => onDismiss(toast.id)} style={closeButtonStyle()} aria-label="Dismiss notification">×</button>
        </div>
      ))}
    </div>
  );
}

function labelFor(type: AppToastType) {
  if (type === "success") return "Success";
  if (type === "error") return "Error";
  if (type === "warning") return "Warning";
  return "Info";
}

function viewportStyle(): React.CSSProperties {
  return {
    position: "fixed",
    right: 16,
    top: 16,
    display: "grid",
    gap: 10,
    width: "min(360px, calc(100vw - 32px))",
    zIndex: 30000,
    pointerEvents: "none",
  };
}

function closeButtonStyle(): React.CSSProperties {
  return {
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
    pointerEvents: "auto",
  };
}

function toastStyle(type: AppToastType): React.CSSProperties {
  const tone = type === "success"
    ? { bg: "rgba(16,185,129,.16)", border: "rgba(16,185,129,.34)", color: "#d1fae5" }
    : type === "error"
    ? { bg: "rgba(255,123,123,.13)", border: "rgba(255,123,123,.34)", color: "#ffe2e2" }
    : type === "warning"
    ? { bg: "rgba(245,158,11,.14)", border: "rgba(245,158,11,.34)", color: "#fff0c9" }
    : { bg: "rgba(63,124,255,.14)", border: "rgba(63,124,255,.32)", color: "#dfe9ff" };
  return {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 12,
    alignItems: "start",
    padding: 14,
    borderRadius: 18,
    border: `1px solid ${tone.border}`,
    background: `linear-gradient(180deg, ${tone.bg} 0%, rgba(17,24,39,.92) 100%)`,
    color: tone.color,
    boxShadow: "0 18px 40px rgba(0,0,0,.28)",
    backdropFilter: "blur(10px)",
    pointerEvents: "auto",
  };
}
