import React from "react";

export default function ConfirmModal({
  open,
  theme = "dark",
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  theme?: "dark" | "light";
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const isLight = theme === "light";
  return (
    <div style={overlayStyle()}>
      <div style={cardStyle(isLight)}>
        <div style={{ fontSize: 22, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{title}</div>
        <div style={{ marginTop: 10, lineHeight: 1.6, color: isLight ? "#5b6578" : "#97a0b3" }}>{description}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={secondaryButtonStyle(isLight)}>{cancelLabel}</button>
          <button onClick={onConfirm} style={confirmButtonStyle(tone)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function overlayStyle(): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(3,6,14,.72)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 25000,
  };
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(460px, 100%)",
    borderRadius: 24,
    padding: 20,
    background: isLight ? "#ffffff" : "#111826",
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    boxShadow: "0 20px 50px rgba(0,0,0,.32)",
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    background: isLight ? "#ffffff" : "#182235",
    color: isLight ? "#10131a" : "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function confirmButtonStyle(tone: "danger" | "primary"): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: tone === "danger" ? "#ff6b6b" : "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  };
}
