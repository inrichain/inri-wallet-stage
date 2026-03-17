import React from "react";
import { buildWcRequestDetails } from "../lib/wcRequestDetails";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  request: any | null;
  approving?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export default function WcRequestModal({
  open,
  theme,
  request,
  approving = false,
  onApprove,
  onReject,
}: Props) {
  if (!open || !request) return null;

  const text = theme === "light" ? "#10131a" : "#fff";
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";
  const details = buildWcRequestDetails(request);
  const primaryIcon = details.kind === "transaction" ? (details.networkIcon || details.dappIcon) : (details.dappIcon || details.networkIcon);
  const [iconFailed, setIconFailed] = React.useState(false);

  return (
    <div style={overlayStyle}>
      <div style={panelStyle(theme)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {!iconFailed && primaryIcon ? (
            <img
              src={primaryIcon}
              alt={details.kind === "transaction" ? details.networkName : details.dappName}
              onError={() => setIconFailed(true)}
              style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }}
            />
          ) : (
            <div style={iconFallback(theme)}>
              {(details.kind === "transaction" ? details.networkName : details.dappName).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{details.title}</div>
            <div style={{ color: sub, fontSize: 14, lineHeight: 1.4 }}>{details.subtitle}</div>
            <div style={{ color: text, fontWeight: 700, marginTop: 4 }}>
              {details.kind === "transaction" ? details.networkName : details.dappName}
            </div>
            {!!details.dappUrl && (
              <div style={{ color: sub, fontSize: 13, wordBreak: "break-all" }}>{details.dappUrl}</div>
            )}
          </div>
        </div>

        <div style={heroBox(theme)}>
          <InfoRow label="Method" value={details.methodLabel || details.method} text={text} sub={sub} />
          <InfoRow label="Network" value={details.networkName} text={text} sub={sub} />
          <InfoRow label="Chain" value={details.chainLabel} text={text} sub={sub} />
        </div>

        {details.kind === "transaction" && (
          <>
            <SectionTitle text="Transaction details" />
            <div style={gridStyle}>
              <Card theme={theme} label="To" value={details.to} hint={details.toFull || "Destination address"} />
              <Card theme={theme} label="Value" value={details.valueNative} hint="Native asset amount" />
              <Card theme={theme} label="Gas limit" value={details.gasLimit} hint="Requested execution gas" />
              <Card
                theme={theme}
                label="Estimated fee"
                value={details.estimatedFeeNative}
                hint={details.maxFeePerGas !== "-" ? `Max fee ${details.maxFeePerGas}` : "Network will estimate"}
              />
              <Card
                theme={theme}
                label="Priority fee"
                value={details.maxPriorityFeePerGas}
                hint={details.gasPrice !== "-" ? `Legacy gas ${details.gasPrice}` : "EIP-1559 or legacy"}
              />
              <Card
                theme={theme}
                label="Interaction"
                value={details.contractInteraction ? "Contract call" : "Native transfer"}
                hint={details.dataPreview}
              />
            </div>
          </>
        )}

        {details.kind === "message" && (
          <>
            <SectionTitle text="Message preview" />
            <pre style={preStyle(theme)}>{details.preview || "Empty message"}</pre>
          </>
        )}

        {details.kind === "typedData" && (
          <>
            <SectionTitle text="Typed data summary" />
            <div style={gridStyle}>
              <Card
                theme={theme}
                label="Domain"
                value={details.summary?.domainName || "Unknown"}
                hint="Signing domain"
              />
              <Card
                theme={theme}
                label="Primary type"
                value={details.summary?.primaryType || "Unknown"}
                hint="Main structured type"
              />
              <Card
                theme={theme}
                label="Fields"
                value={String(details.summary?.fieldCount || 0)}
                hint={(details.summary?.fields || []).join(", ") || "No visible fields"}
              />
            </div>
            <pre style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</pre>
          </>
        )}

        {details.kind === "raw" && <pre style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</pre>}

        <SectionTitle text="Security notice" />
        <div style={riskBox(theme)}>
          {details.riskItems.map((item: string, index: number) => (
            <div key={index} style={{ display: "flex", gap: 8, color: sub, lineHeight: 1.45 }}>
              <span style={{ color: "#ffb020", fontWeight: 900 }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button style={secondaryBtn(theme)} onClick={onReject} disabled={approving}>
            Reject
          </button>
          <button style={primaryBtn(approving)} onClick={onApprove} disabled={approving}>
            {approving ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <div style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 10px" }}>{text}</div>;
}

function InfoRow({
  label,
  value,
  text,
  sub,
}: {
  label: string;
  value: string;
  text: string;
  sub: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <span style={{ color: sub }}>{label}</span>
      <strong style={{ color: text, textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function Card({
  theme,
  label,
  value,
  hint,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
  hint?: string;
}) {
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";
  const text = theme === "light" ? "#10131a" : "#fff";

  return (
    <div style={cardStyle(theme)}>
      <div style={{ color: sub, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: text, fontSize: 15, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>{value}</div>
      {hint ? <div style={{ color: sub, fontSize: 12, marginTop: 6, lineHeight: 1.35 }}>{hint}</div> : null}
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
    width: "min(720px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 24px)",
    overflow: "auto",
    background: theme === "light" ? "#fff" : "#111722",
    color: theme === "light" ? "#10131a" : "#fff",
    border: `1px solid ${theme === "light" ? "#dbe2ef" : "#273042"}`,
    borderRadius: 24,
    padding: 20,
    boxSizing: "border-box",
    boxShadow: theme === "light" ? "0 24px 80px rgba(20,30,50,.14)" : "0 24px 80px rgba(0,0,0,.45)",
  };
}

function heroBox(theme: "dark" | "light"): React.CSSProperties {
  return {
    display: "grid",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    background: theme === "light" ? "#f4f7fb" : "#0a1018",
    border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}`,
  };
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

function cardStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    background: theme === "light" ? "#f8fbff" : "#0d1420",
    border: `1px solid ${theme === "light" ? "#dde6f3" : "#223044"}`,
  };
}

function riskBox(theme: "dark" | "light"): React.CSSProperties {
  return {
    display: "grid",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    background: theme === "light" ? "#fff7eb" : "rgba(255,176,32,.08)",
    border: `1px solid ${theme === "light" ? "#ffe0ae" : "rgba(255,176,32,.22)"}`,
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
    lineHeight: 1.45,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    fontWeight: 800,
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.82 : 1,
  };
}

function secondaryBtn(theme: "dark" | "light"): React.CSSProperties {
  return {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#d3dceb" : "#2c3950"}`,
    background: "transparent",
    color: theme === "light" ? "#10131a" : "#fff",
    fontWeight: 800,
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.82 : 1,
  };
}

function iconFallback(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: theme === "light" ? "#e6eefc" : "#1b2740",
    color: theme === "light" ? "#234692" : "#8fb0ff",
    flexShrink: 0,
  };
}
