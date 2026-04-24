import React from "react";

export default function EmptyState({
  title,
  description,
  theme = "dark",
  action,
}: {
  title: string;
  description?: string;
  theme?: "dark" | "light";
  action?: React.ReactNode;
}) {
  const isLight = theme === "light";
  return (
    <div
      className="wallet-empty-state"
      style={{
        borderColor: isLight ? "#d9e2f0" : "#2b3950",
        background: isLight ? "#f8fbff" : "rgba(13,20,32,.68)",
      }}
    >
      <div style={{ fontSize: 28 }}>◌</div>
      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{title}</div>
      {description ? <div className="wallet-ui-subtle" style={{ maxWidth: 520 }}>{description}</div> : null}
      {action ? <div className="wallet-action-row" style={{ justifyContent: "center" }}>{action}</div> : null}
    </div>
  );
}
