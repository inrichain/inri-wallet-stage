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
    <div style={overlayStyle} onClick={onCancel}>
      <div style={cardStyle(isLight)} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={pillStyle(isLight)}>{tone === "danger" ? "Review action" : "INRI Wallet"}</div>
          <div style={{ ...pillStyle(isLight), color: tone === "danger" ? "#ff8d8d" : "#8cc6ff", borderColor: tone === "danger" ? "rgba(255,141,141,.35)" : "rgba(96,165,250,.3)" }}>{tone === "danger" ? "Sensitive" : "Confirm"}</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", lineHeight: 1.08 }}>{title}</div>
        <div style={{ marginTop: 12, lineHeight: 1.7, color: isLight ? "#5b6578" : "#97a0b3" }}>{description}</div>
        <div style={noticeStyle(isLight)}>
          Double-check the destination, amount and network before approving.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={secondaryButtonStyle(isLight)}>{cancelLabel}</button>
          <button onClick={onConfirm} style={confirmButtonStyle(tone)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(3,6,14,.72)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: 25000,
};

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(520px, 100%)",
    borderRadius: 28,
    padding: 20,
    background: isLight ? "linear-gradient(180deg,#ffffff 0%, #f8fbff 100%)" : "linear-gradient(180deg,#101826 0%, #0b1120 100%)",
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    boxShadow: "0 24px 70px rgba(0,0,0,.32)",
  };
}

function pillStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 999,
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    background: isLight ? "#ffffff" : "rgba(15,23,42,.72)",
    color: isLight ? "#334155" : "#d8e3ff",
    fontSize: 12,
    fontWeight: 800,
  };
}

function noticeStyle(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${isLight ? "#fde7c0" : "rgba(255,190,85,.22)"}`,
    background: isLight ? "#fffbf2" : "rgba(255,190,85,.06)",
    color: isLight ? "#7c4a00" : "#ffcf7c",
    fontSize: 13,
    lineHeight: 1.55,
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 16,
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
    borderRadius: 16,
    border: "none",
    background: tone === "danger" ? "linear-gradient(90deg,#ff7b7b 0%, #ff5a8f 100%)" : "linear-gradient(90deg,#35c3ff 0%, #4f7cff 100%)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  };
}
