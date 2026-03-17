import React from "react";
import { parseTypedDataPayload, getTypedDataRiskHints, formatValuePreview } from "../lib/wcTypedData";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  request: any | null;
  onApprove: () => void;
  onReject: () => void;
};

function methodTitle(method: string) {
  if (method === "eth_signTypedData_v4") return "Sign typed data";
  if (method === "eth_signTypedData_v3") return "Sign typed data v3";
  if (method === "eth_signTypedData") return "Sign typed data";
  if (method === "personal_sign") return "Sign message";
  if (method === "eth_sendTransaction") return "Confirm transaction";
  return "Confirm request";
}

function tone(theme: "dark" | "light") {
  return {
    bg: theme === "light" ? "#fff" : "#111722",
    text: theme === "light" ? "#10131a" : "#fff",
    sub: theme === "light" ? "#5f6b7d" : "#9aa4b5",
    border: theme === "light" ? "#dbe2ef" : "#273042",
    soft: theme === "light" ? "#f4f7fb" : "#0a0f18",
    softBorder: theme === "light" ? "#dbe3f0" : "#243045",
    warningBg: theme === "light" ? "rgba(255,190,92,.12)" : "rgba(255,190,92,.10)",
    warningBorder: "rgba(255,190,92,.35)",
  };
}

function InfoRow({ label, value, text, sub }: { label: string; value: any; text: string; sub: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0" }}>
      <div style={{ color: sub }}>{label}</div>
      <div style={{ color: text, fontWeight: 800, textAlign: "right", wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function WcRequestModal({ open, theme, request, onApprove, onReject }: Props) {
  if (!open || !request) return null;

  const c = tone(theme);
  const method = String(request.method || "");

  let typedData: ReturnType<typeof parseTypedDataPayload> | null = null;
  let typedHints: string[] = [];
  if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
    try {
      typedData = parseTypedDataPayload(method, request.params);
      typedHints = getTypedDataRiskHints(typedData);
    } catch {
      typedData = null;
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle(theme)}>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>
          {methodTitle(method)}
        </div>

        <div style={{ color: c.sub, marginBottom: 14 }}>
          Review the request before approving it in your wallet.
        </div>

        <div style={cardStyle(theme)}>
          <InfoRow label="Method" value={method.replace(/^eth_/, "")} text={c.text} sub={c.sub} />
          <InfoRow label="Chain" value={request.chainId || "-"} text={c.text} sub={c.sub} />
        </div>

        {typedData ? (
          <>
            <Section title="Domain">
              <div style={cardStyle(theme)}>
                <InfoRow label="Name" value={typedData.domain.name || "-"} text={c.text} sub={c.sub} />
                <InfoRow label="Version" value={typedData.domain.version || "-"} text={c.text} sub={c.sub} />
                <InfoRow label="Chain ID" value={typedData.domain.chainId ?? "-"} text={c.text} sub={c.sub} />
                <InfoRow
                  label="Verifier"
                  value={formatValuePreview(typedData.domain.verifyingContract)}
                  text={c.text}
                  sub={c.sub}
                />
                <InfoRow label="Primary type" value={typedData.primaryType} text={c.text} sub={c.sub} />
              </div>
            </Section>

            <Section title="Fields">
              <div style={cardStyle(theme)}>
                {Object.entries(typedData.message).length === 0 ? (
                  <div style={{ color: c.sub }}>No structured message fields.</div>
                ) : (
                  Object.entries(typedData.message).map(([key, value]) => (
                    <InfoRow
                      key={key}
                      label={key}
                      value={formatValuePreview(value)}
                      text={c.text}
                      sub={c.sub}
                    />
                  ))
                )}
              </div>
            </Section>

            <Section title="Type definitions">
              <div style={preStyle(theme)}>
                {JSON.stringify(typedData.types, null, 2)}
              </div>
            </Section>

            <Section title="Security notice">
              <div style={{ ...cardStyle(theme), background: c.warningBg, borderColor: c.warningBorder }}>
                <div style={{ color: c.text, fontWeight: 700, marginBottom: typedHints.length ? 8 : 0 }}>
                  Typed data signatures can authorize actions without sending an on-chain transaction.
                </div>
                {typedHints.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: c.sub }}>
                    {typedHints.map((hint) => (
                      <li key={hint} style={{ marginBottom: 4 }}>{hint}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: c.sub }}>Verify the domain, contract and message fields carefully.</div>
                )}
              </div>
            </Section>
          </>
        ) : method === "personal_sign" ? (
          <Section title="Message">
            <div style={preStyle(theme)}>
              {Array.isArray(request.params) ? String(request.params[0] ?? request.params[1] ?? "") : ""}
            </div>
          </Section>
        ) : (
          <Section title="Request payload">
            <div style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</div>
          </Section>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
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
    width: "min(720px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 24px)",
    overflow: "auto",
    background: theme === "light" ? "#fff" : "#111722",
    color: theme === "light" ? "#10131a" : "#fff",
    border: `1px solid ${theme === "light" ? "#dbe2ef" : "#273042"}`,
    borderRadius: 24,
    padding: 20,
    boxSizing: "border-box",
  };
}

function cardStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    background: theme === "light" ? "#f4f7fb" : "#0a0f18",
    border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}`,
    borderRadius: 16,
    padding: 12,
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
