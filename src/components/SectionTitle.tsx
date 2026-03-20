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
        <div
          style={{
            fontSize: compact ? 17 : 28,
            fontWeight: 900,
            color: isLight ? "#10131a" : "#ffffff",
            lineHeight: compact ? 1.2 : 1.1,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div className="wallet-ui-subtle" style={{ marginTop: compact ? 4 : 8 }}>{subtitle}</div>
        ) : null}
      </div>
      {actions ? <div className="wallet-action-row">{actions}</div> : null}
    </div>
  );
}
