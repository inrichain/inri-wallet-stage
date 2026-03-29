import React, { useMemo, useState } from "react";
import LogoImage from "./LogoImage";

export type TxConfirmItem = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  mono?: boolean;
};

export type TxConfirmSection = {
  title?: string;
  items: TxConfirmItem[];
};

export default function TransactionConfirmModal({
  open,
  theme = "dark",
  title,
  subtitle,
  actionLabel,
  networkName,
  networkLogo,
  category,
  riskLabel,
  riskTone = "medium",
  sections,
  warnings = [],
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  advancedLabel = "Advanced details",
  advancedContent,
  confirmDisabled = false,
  confirmBusy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  theme?: "dark" | "light";
  title: string;
  subtitle?: string;
  actionLabel?: string;
  networkName?: string;
  networkLogo?: string;
  category?: string;
  riskLabel?: string;
  riskTone?: "low" | "medium" | "high";
  sections: TxConfirmSection[];
  warnings?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  advancedLabel?: string;
  advancedContent?: React.ReactNode;
  confirmDisabled?: boolean;
  confirmBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isLight = theme === "light";

  const riskColors = useMemo(() => {
    if (riskTone === "high") return { fg: "#ff8d8d", bd: "rgba(255,141,141,.35)", bg: isLight ? "#fff5f5" : "rgba(255,141,141,.12)" };
    if (riskTone === "low") return { fg: "#6be3a1", bd: "rgba(107,227,161,.28)", bg: isLight ? "#f1fff8" : "rgba(107,227,161,.10)" };
    return { fg: "#ffbe55", bd: "rgba(255,190,85,.30)", bg: isLight ? "#fffaf0" : "rgba(255,190,85,.10)" };
  }, [isLight, riskTone]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={panelStyle(isLight)} onClick={(e) => e.stopPropagation()}>
        <div style={heroStyle(isLight)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div style={iconWrapStyle(isLight)}>
              <LogoImage src={networkLogo || ""} alt={networkName || "INRI"} kind="network" label={networkName || "INRI"} size={30} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {category ? <Pill theme={theme}>{category}</Pill> : null}
                {actionLabel ? <Pill theme={theme} tone="primary">{actionLabel}</Pill> : null}
                {riskLabel ? <div style={{ ...pillBaseStyle(theme), background: riskColors.bg, borderColor: riskColors.bd, color: riskColors.fg }}>{riskLabel}</div> : null}
              </div>
              <div style={{ color: isLight ? "#0f172a" : "#ffffff", fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>{title}</div>
              {subtitle ? <div style={{ color: isLight ? "#64748b" : "#9fb0c7", marginTop: 8, lineHeight: 1.55 }}>{subtitle}</div> : null}
              {networkName ? <div style={{ color: isLight ? "#334155" : "#d8e3ff", marginTop: 8, fontWeight: 700 }}>{networkName}</div> : null}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          {sections.map((section, idx) => (
            <div key={idx} style={sectionCardStyle(isLight)}>
              {section.title ? <div style={{ color: isLight ? "#64748b" : "#8fa0b7", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>{section.title}</div> : null}
              <div style={{ display: "grid", gap: 10 }}>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={rowStyle(isLight)}>
                    <div style={{ color: isLight ? "#64748b" : "#8fa0b7", fontSize: 13, fontWeight: 700 }}>{item.label}</div>
                    <div style={{ textAlign: "right", minWidth: 0 }}>
                      <div style={{ color: isLight ? "#0f172a" : "#ffffff", fontWeight: 800, wordBreak: item.mono ? "break-all" : "break-word", fontFamily: item.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit" }}>{item.value || "-"}</div>
                      {item.hint ? <div style={{ color: isLight ? "#94a3b8" : "#7f8ea7", fontSize: 12, marginTop: 4 }}>{item.hint}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {warnings.length ? (
            <div style={warningBoxStyle(isLight)}>
              <div style={{ color: isLight ? "#0f172a" : "#ffffff", fontWeight: 800, marginBottom: 8 }}>Check before confirming</div>
              <div style={{ display: "grid", gap: 8 }}>
                {warnings.map((warning, index) => (
                  <div key={index} style={{ display: "flex", gap: 8, color: isLight ? "#64748b" : "#9fb0c7", lineHeight: 1.45 }}>
                    <span style={{ color: riskColors.fg, fontWeight: 900 }}>•</span>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {advancedContent ? (
            <div style={sectionCardStyle(isLight)}>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: isLight ? "#0f172a" : "#ffffff",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showAdvanced ? "Hide advanced details" : advancedLabel}
              </button>
              {showAdvanced ? <div style={{ marginTop: 12 }}>{advancedContent}</div> : null}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={secondaryButtonStyle(isLight)} onClick={onCancel} disabled={confirmBusy}>{cancelLabel}</button>
          <button style={confirmButtonStyle(confirmDisabled || confirmBusy)} onClick={onConfirm} disabled={confirmDisabled || confirmBusy}>
            {confirmBusy ? "Confirming..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pill({ theme, tone = "default", children }: { theme: "dark" | "light"; tone?: "default" | "primary"; children: React.ReactNode }) {
  return <div style={{ ...pillBaseStyle(theme), ...(tone === "primary" ? { background: theme === "light" ? "#eef4ff" : "rgba(96,165,250,.12)", borderColor: theme === "light" ? "#c7dbff" : "rgba(96,165,250,.28)", color: theme === "light" ? "#1d4ed8" : "#8cc6ff" } : {}) }}>{children}</div>;
}

function pillBaseStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 999,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#263247"}`,
    background: theme === "light" ? "#ffffff" : "rgba(15,23,42,.55)",
    color: theme === "light" ? "#334155" : "#d8e3ff",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".02em",
  };
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,.72)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  padding: 18,
  zIndex: 35000,
};

function panelStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(760px, 100%)",
    maxHeight: "min(92vh, 920px)",
    overflowY: "auto",
    borderRadius: 28,
    padding: 18,
    border: `1px solid ${isLight ? "#dbe2f0" : "#233149"}`,
    background: isLight ? "linear-gradient(180deg,#ffffff 0%, #f7fbff 100%)" : "linear-gradient(180deg,#0d1523 0%, #0b1120 100%)",
    boxShadow: "0 30px 80px rgba(0,0,0,.35)",
  };
}

function heroStyle(isLight: boolean): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 16,
    border: `1px solid ${isLight ? "#e2e8f0" : "#233149"}`,
    background: isLight ? "linear-gradient(180deg,#f8fbff 0%, #ffffff 100%)" : "linear-gradient(180deg,rgba(22,34,54,.92) 0%, rgba(11,17,32,.92) 100%)",
  };
}

function iconWrapStyle(isLight: boolean): React.CSSProperties {
  return {
    width: 56,
    height: 56,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    border: `1px solid ${isLight ? "#dbe2f0" : "#233149"}`,
    background: isLight ? "#ffffff" : "rgba(15,23,42,.72)",
    flexShrink: 0,
  };
}

function sectionCardStyle(isLight: boolean): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: 14,
    border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`,
    background: isLight ? "#ffffff" : "rgba(11,17,32,.92)",
  };
}

function rowStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 1.3fr)",
    gap: 12,
    alignItems: "start",
    paddingBottom: 10,
    borderBottom: `1px solid ${isLight ? "#edf2f7" : "#162033"}`,
  };
}

function warningBoxStyle(isLight: boolean): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: 14,
    border: `1px solid ${isLight ? "#fde7c0" : "rgba(255,190,85,.20)"}`,
    background: isLight ? "#fffbf2" : "rgba(255,190,85,.06)",
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 16,
    border: `1px solid ${isLight ? "#dbe2f0" : "#263247"}`,
    background: isLight ? "#ffffff" : "#141f33",
    color: isLight ? "#0f172a" : "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
  };
}

function confirmButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: 16,
    border: "none",
    background: disabled ? "#64748b" : "linear-gradient(90deg,#35c3ff 0%, #4f7cff 100%)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
    minWidth: 152,
  };
}
