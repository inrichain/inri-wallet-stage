import React from "react";

export default function SectionTitle({
  title,
  subtitle,
  theme = "dark",
  actions,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  theme?: "dark" | "light";
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  const isLight = theme === "light";
  return (
    <div className="wallet-section-head">
      <div style={{ minWidth: 0 }}>
        <div className={`wallet-section-title ${compact ? "compact" : ""}`.trim()} style={{ color: isLight ? "#10131a" : "#ffffff" }}>
          {title}
        </div>
        {subtitle ? (
          <div className={`wallet-ui-subtle wallet-section-subtitle ${compact ? "compact" : ""}`.trim()}>{subtitle}</div>
        ) : null}
      </div>
      {actions ? <div className="wallet-action-row">{actions}</div> : null}
    </div>
  );
}
