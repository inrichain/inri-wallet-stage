import React from "react";
import { tr } from "../i18n/translations";
import { getNetworkByChainId } from "../lib/network";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  lang?: string;
  proposal: any | null;
  onApprove: () => void;
  onReject: () => void;
};

export default function WcSessionProposalModal({ open, theme, lang = "en", proposal, onApprove, onReject }: Props) {
  if (!open || !proposal) return null;
  const bg = theme === "light" ? "#ffffff" : "#111722";
  const border = theme === "light" ? "#d9e1ef" : "#273042";
  const text = theme === "light" ? "#10131a" : "#ffffff";
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";
  const t = (key: string) => tr(lang, key);
  const requested = proposal.requiredNamespaces && Object.keys(proposal.requiredNamespaces).length > 0 ? proposal.requiredNamespaces : proposal.optionalNamespaces || {};
  const eip = requested?.eip155 || {};
  const chains = Array.isArray(eip.chains) ? eip.chains : [];
  const methods = Array.isArray(eip.methods) ? eip.methods : [];

  return (
    <div style={overlayStyle}>
      <div style={{ width: "min(560px, calc(100vw - 20px))", maxHeight: "min(92dvh, 780px)", overflowY: "auto", background: bg, color: text, border: `1px solid ${border}`, borderRadius: 24, padding: 20, boxSizing: "border-box" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{t("wc_proposal_title")}</div>
        <div style={{ color: sub, marginBottom: 16, lineHeight: 1.45 }}><strong>{proposal.proposerName}</strong>{proposal.proposerUrl ? ` • ${proposal.proposerUrl}` : ""}</div>
        <div style={sectionStyle(theme)}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("wc_proposal_requested_access")}</div>
          <div style={{ display: "grid", gap: 8 }}>
            <div><span style={{ color: sub }}>Chains</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chains.length ? chains.map((chain: string) => {
                const chainId = Number(String(chain).split(":")[1] || 0);
                const known = getNetworkByChainId(chainId);
                return <span key={chain} style={pill(theme)}>{known?.name || `Chain ${chainId}`}</span>;
              }) : <span style={{ color: sub }}>No explicit chain list</span>}
            </div>
            <div style={{ marginTop: 8 }}><span style={{ color: sub }}>Methods</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {methods.length ? methods.map((method: string) => <span key={method} style={pill(theme)}>{method}</span>) : <span style={{ color: sub }}>No explicit method list</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button style={secondaryBtn(theme)} onClick={onReject}>{t("wc_proposal_reject")}</button>
          <button style={primaryBtn()} onClick={onApprove}>{t("wc_proposal_approve")}</button>
        </div>
      </div>
    </div>
  );
}
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 10 };
function sectionStyle(theme: "dark" | "light"): React.CSSProperties { return { background: theme === "light" ? "#f4f7fb" : "#0a0f18", border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}`, borderRadius: 14, padding: 14 }; }
function pill(theme: "dark" | "light"): React.CSSProperties { return { padding: "8px 10px", borderRadius: 999, background: theme === "light" ? "#eaf1ff" : "#16213b", color: theme === "light" ? "#2450b8" : "#8cb2ff", fontWeight: 700, fontSize: 12 }; }
function primaryBtn(): React.CSSProperties { return { flex: 1, height: 46, borderRadius: 14, border: "none", background: "#3f7cff", color: "#fff", fontWeight: 800, cursor: "pointer" }; }
function secondaryBtn(theme: "dark" | "light"): React.CSSProperties { return { flex: 1, height: 46, borderRadius: 14, border: `1px solid ${theme === "light" ? "#d3dceb" : "#2c3950"}`, background: "transparent", color: theme === "light" ? "#10131a" : "#fff", fontWeight: 800, cursor: "pointer" }; }
