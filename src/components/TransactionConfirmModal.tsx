import React from "react";

export type TransactionConfirmItem = {
  label: string;
  value: string;
  mono?: boolean;
};

export default function TransactionConfirmModal({
  open,
  theme = "dark",
  title,
  subtitle,
  badge,
  items,
  warnings = [],
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  theme?: "dark" | "light";
  title: string;
  subtitle?: string;
  badge?: string;
  items: TransactionConfirmItem[];
  warnings?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const isLight = theme === "light";

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={panelStyle(isLight)} onClick={(event) => event.stopPropagation()}>
        <div style={heroStyle(isLight)}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff" }}>{title}</div>
              {badge ? <span style={badgeStyle(isLight)}>{badge}</span> : null}
            </div>
            {subtitle ? <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#94a3b8", lineHeight: 1.5 }}>{subtitle}</div> : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} style={itemStyle(isLight)}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8", marginBottom: 6 }}>
                {item.label}
              </div>
              <div
                style={{
                  color: isLight ? "#0f172a" : "#ffffff",
                  fontWeight: 800,
                  fontSize: 15,
                  lineHeight: 1.45,
                  wordBreak: item.mono ? "break-all" : "break-word",
                  fontFamily: item.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
                }}
              >
                {item.value || "-"}
              </div>
            </div>
          ))}
        </div>

        {warnings.length ? (
          <div style={warningBoxStyle(isLight)}>
            {warnings.map((warning, index) => (
              <div key={`${warning}-${index}`} style={{ display: "flex", gap: 8, lineHeight: 1.45, color: isLight ? "#8a4b00" : "#fdba74" }}>
                <span style={{ fontWeight: 900 }}>•</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onCancel} disabled={confirming} style={secondaryButtonStyle(isLight)}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={confirming} style={primaryButtonStyle(confirming)}>
            {confirming ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
  zIndex: 12000,
};

function panelStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(620px, calc(100vw - 28px))",
    maxHeight: "calc(100vh - 28px)",
    overflow: "auto",
    borderRadius: 24,
    border: `1px solid ${isLight ? "#dbe2f0" : "#223045"}`,
    background: isLight ? "#ffffff" : "#0b1220",
    boxShadow: isLight ? "0 30px 80px rgba(15,23,42,.18)" : "0 30px 80px rgba(0,0,0,.5)",
    padding: 18,
  };
}

function heroStyle(isLight: boolean): React.CSSProperties {
  return {
    borderRadius: 20,
    padding: 16,
    border: `1px solid ${isLight ? "#dbe2f0" : "#223045"}`,
    background: isLight ? "linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)" : "linear-gradient(180deg,#101a2d 0%,#0b1220 100%)",
  };
}

function itemStyle(isLight: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`,
    background: isLight ? "#f8fafc" : "#0f172a",
  };
}

function warningBoxStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "grid",
    gap: 8,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${isLight ? "#fed7aa" : "rgba(251,146,60,.24)"}`,
    background: isLight ? "#fff7ed" : "rgba(251,146,60,.08)",
  };
}

function badgeStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "7px 10px",
    borderRadius: 999,
    border: `1px solid ${isLight ? "rgba(63,124,255,.24)" : "rgba(96,165,250,.22)"}`,
    background: isLight ? "#eef4ff" : "rgba(63,124,255,.14)",
    color: isLight ? "#2453d4" : "#8bb4ff",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#223045"}`,
    background: "transparent",
    color: isLight ? "#0f172a" : "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function primaryButtonStyle(confirming: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: "none",
    background: confirming ? "#7da8ff" : "linear-gradient(135deg,#2ec7b8 0%,#5a7cff 100%)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: confirming ? "default" : "pointer",
    boxShadow: "0 12px 28px rgba(63,124,255,.28)",
  };
}
