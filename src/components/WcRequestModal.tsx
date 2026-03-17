import React from "react";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  request: any | null;
  onApprove: () => void;
  onReject: () => void;
};

export default function WcRequestModal({
  open,
  theme,
  request,
  onApprove,
  onReject,
}: Props) {
  if (!open || !request) return null;

  const text = theme === "light" ? "#10131a" : "#fff";
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";

  return (
    <div style={overlayStyle}>
      <div style={panelStyle(theme)}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          Confirm Request
        </div>

        <div style={{ color: sub, marginBottom: 8 }}>
          Method: <strong style={{ color: text }}>{request.method}</strong>
        </div>

        <div style={{ color: sub, marginBottom: 14 }}>
          Chain: <strong style={{ color: text }}>{request.chainId}</strong>
        </div>

        <pre style={preStyle(theme)}>
          {JSON.stringify(request.params, null, 2)}
        </pre>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={secondaryBtn(theme)} onClick={onReject}>
            Reject
          </button>
          <button style={primaryBtn()} onClick={onApprove}>
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 12,
};

function panelStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "min(560px, calc(100vw - 24px))",
    background: theme === "light" ? "#fff" : "#111722",
    color: theme === "light" ? "#10131a" : "#fff",
    border: `1px solid ${theme === "light" ? "#dbe2ef" : "#273042"}`,
    borderRadius: 24,
    padding: 20,
    boxSizing: "border-box",
  };
}

function preStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    background: theme === "light" ? "#f4f7fb" : "#0a0f18",
    border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 260,
    overflow: "auto",
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    flex: 1,
    height: 46,
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function secondaryBtn(theme: "dark" | "light"): React.CSSProperties {
  return {
    flex: 1,
    height: 46,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#d3dceb" : "#2c3950"}`,
    background: "transparent",
    color: theme === "light" ? "#10131a" : "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}
