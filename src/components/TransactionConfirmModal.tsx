import React from "react";

type Row = {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "danger" | "warning" | "success";
};

export default function TransactionConfirmModal({
  open,
  theme = "dark",
  title,
  subtitle,
  kind,
  rows,
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  theme?: "dark" | "light";
  title: string;
  subtitle?: string;
  kind?: string;
  rows: Row[];
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  const isLight = theme === "light";

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        background: isLight ? "rgba(15,23,42,.28)" : "rgba(3,7,18,.68)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: 28,
          border: `1px solid ${isLight ? "#dbe2f0" : "#243041"}`,
          background: isLight ? "#ffffff" : "linear-gradient(180deg,#0f1728 0%, #0b1120 100%)",
          boxShadow: isLight ? "0 28px 70px rgba(15,23,42,.18)" : "0 30px 80px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 22, borderBottom: `1px solid ${isLight ? "#e6edf7" : "#1e293b"}`, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              {kind ? (
                <div style={{ display: "inline-flex", width: "fit-content", padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "#60a5fa", background: isLight ? "#eef4ff" : "rgba(59,130,246,.12)", border: `1px solid ${isLight ? "#cfe0ff" : "rgba(59,130,246,.2)"}` }}>{kind}</div>
              ) : null}
              <div style={{ fontSize: 28, lineHeight: 1.05, fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff", letterSpacing: "-.03em" }}>{title}</div>
              {subtitle ? <div style={{ color: isLight ? "#475569" : "#94a3b8", lineHeight: 1.5 }}>{subtitle}</div> : null}
            </div>
            <button onClick={onCancel} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#243041"}`, background: isLight ? "#f8fafc" : "#101826", color: isLight ? "#0f172a" : "#e2e8f0", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 12 }}>
          {rows.map((row, index) => {
            const toneColor = row.tone === "danger" ? (isLight ? "#b91c1c" : "#fca5a5") : row.tone === "warning" ? (isLight ? "#b45309" : "#fbbf24") : row.tone === "success" ? (isLight ? "#047857" : "#6ee7b7") : (isLight ? "#0f172a" : "#e2e8f0");
            return (
              <div key={`${row.label}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: "14px 16px", background: isLight ? "#f8fafc" : "#0b1120" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: isLight ? "#64748b" : "#94a3b8" }}>{row.label}</div>
                <div style={{ color: toneColor, fontWeight: 800, textAlign: "right", wordBreak: row.mono ? "break-all" : "break-word", fontFamily: row.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", maxWidth: "65%" }}>{row.value || "-"}</div>
              </div>
            );
          })}

          {warning ? (
            <div style={{ borderRadius: 18, padding: 14, border: `1px solid ${isLight ? "#fde68a" : "rgba(251,191,36,.25)"}`, background: isLight ? "#fff7d6" : "rgba(251,191,36,.09)", color: isLight ? "#92400e" : "#fcd34d", lineHeight: 1.5, fontWeight: 700 }}>{warning}</div>
          ) : null}
        </div>

        <div style={{ padding: 22, paddingTop: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={onCancel} disabled={busy} style={{ minHeight: 52, borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#243041"}`, background: isLight ? "#ffffff" : "#101826", color: isLight ? "#0f172a" : "#e2e8f0", fontWeight: 900, cursor: "pointer" }}>{cancelLabel}</button>
          <button onClick={onConfirm} disabled={busy} style={{ minHeight: 52, borderRadius: 18, border: "1px solid rgba(59,130,246,.28)", background: busy ? (isLight ? "#cbd5e1" : "#1e293b") : "linear-gradient(135deg,#3b82f6 0%, #2563eb 100%)", color: "#ffffff", fontWeight: 900, cursor: busy ? "not-allowed" : "pointer", boxShadow: busy ? "none" : "0 16px 34px rgba(37,99,235,.26)" }}>{busy ? "Processing..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
