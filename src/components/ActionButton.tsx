import React from "react";

type Tone = "primary" | "secondary" | "danger" | "ghost";

export default function ActionButton({
  children,
  onClick,
  theme = "dark",
  tone = "secondary",
  compact = false,
  disabled = false,
  asLabel = false,
  style,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  theme?: "dark" | "light";
  tone?: Tone;
  compact?: boolean;
  disabled?: boolean;
  asLabel?: boolean;
  style?: React.CSSProperties;
  title?: string;
}) {
  const isLight = theme === "light";
  const base: React.CSSProperties = {
    padding: compact ? "9px 11px" : "11px 14px",
    borderRadius: 14,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: compact ? 38 : 44,
    transition: "transform .14s ease, opacity .14s ease, box-shadow .14s ease",
    opacity: disabled ? 0.55 : 1,
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const toneStyles: Record<Tone, React.CSSProperties> = {
    primary: { border: "none", background: "#3f7cff", color: "#ffffff", boxShadow: "0 10px 24px rgba(63,124,255,.22)" },
    secondary: { border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1520", color: isLight ? "#10131a" : "#ffffff" },
    ghost: { border: `1px solid ${isLight ? "#e7eef8" : "#202635"}`, background: "transparent", color: isLight ? "#10131a" : "#ffffff" },
    danger: { border: "1px solid rgba(255,123,123,.26)", background: "rgba(255,123,123,.08)", color: "#ff7b7b" },
  };

  if (asLabel) {
    return (
      <label className="wallet-ui-btn" style={{ ...base, ...toneStyles[tone], ...style }} title={title}>
        {children}
      </label>
    );
  }

  return (
    <button className="wallet-ui-btn" onClick={disabled ? undefined : onClick} style={{ ...base, ...toneStyles[tone], ...style }} title={title} disabled={disabled}>
      {children}
    </button>
  );
}
