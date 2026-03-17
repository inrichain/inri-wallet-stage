import React from "react";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  proposal: any | null;
  onApprove: () => void;
  onReject: () => void;
};

export default function WcSessionProposalModal({
  open,
  theme,
  proposal,
  onApprove,
  onReject,
}: Props) {
  if (!open || !proposal) return null;

  const bg = theme === "light" ? "#ffffff" : "#111722";
  const border = theme === "light" ? "#d9e1ef" : "#273042";
  const text = theme === "light" ? "#10131a" : "#ffffff";
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";

  return (
    <div style={overlayStyle}>
      <div
        style={{
          width: "min(520px, calc(100vw - 24px))",
          background: bg,
          color: text,
          border: `1px solid ${border}`,
          borderRadius: 24,
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          Connect Wallet
        </div>

        <div style={{ color: sub, marginBottom: 16 }}>
          <strong>{proposal.proposerName}</strong>
          {proposal.proposerUrl ? ` • ${proposal.proposerUrl}` : ""}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Requested access</div>
          <pre style={preStyle(theme)}>
            {JSON.stringify(proposal.requiredNamespaces, null, 2)}
          </pre>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
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
  zIndex: 9999,
  padding: 12,
};

function preStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    background: theme === "light" ? "#f4f7fb" : "#0a0f18",
    border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 220,
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
