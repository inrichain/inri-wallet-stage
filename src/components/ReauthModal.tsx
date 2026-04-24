import React from "react";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  title: string;
  hint: string;
  passwordPlaceholder: string;
  confirmLabel: string;
  cancelLabel: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string;
};

export default function ReauthModal({
  open,
  theme,
  title,
  hint,
  passwordPlaceholder,
  confirmLabel,
  cancelLabel,
  value,
  onChange,
  onConfirm,
  onCancel,
  error,
}: Props) {
  if (!open) return null;
  const isLight = theme === "light";

  return (
    <div style={overlayStyle()}>
      <div style={cardStyle(isLight)}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{title}</div>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.55, marginBottom: 14 }}>{hint}</div>
        <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={passwordPlaceholder} style={inputStyle(isLight)} />
        {error ? <div style={{ marginTop: 10, color: "#ff7b7b", fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
        <div className="wallet-action-wrap" style={{ marginTop: 16 }}>
          <button onClick={onConfirm} style={primaryActionStyle()}>{confirmLabel}</button>
          <button onClick={onCancel} style={secondaryActionStyle(isLight)}>{cancelLabel}</button>
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
    zIndex: 20000,
  };
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(420px, 100%)",
    borderRadius: 24,
    padding: 20,
    background: isLight ? "#ffffff" : "#111826",
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    boxShadow: "0 20px 50px rgba(0,0,0,.32)",
    color: isLight ? "#10131a" : "#ffffff",
  };
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    background: isLight ? "#f6f8fc" : "#0b1120",
    color: isLight ? "#10131a" : "#ffffff",
    boxSizing: "border-box",
    outline: "none",
  };
}

function primaryActionStyle(): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  };
}

function secondaryActionStyle(isLight: boolean): React.CSSProperties {
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
