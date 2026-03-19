import React from "react";
import { tr } from "../i18n/translations";
import { getAllNetworks, makeNetworkFromChainId } from "../lib/network";
import { resolveDappAsset } from "../lib/assets";
import LogoImage from "./LogoImage";

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

  const isLight = theme === "light";
  const bg = isLight ? "#ffffff" : "#111722";
  const border = isLight ? "#d9e1ef" : "#273042";
  const text = isLight ? "#10131a" : "#ffffff";
  const sub = isLight ? "#5f6b7d" : "#9aa4b5";
  const t = (key: string) => tr(lang, key);

  const requested = proposal.requiredNamespaces && Object.keys(proposal.requiredNamespaces).length > 0
    ? proposal.requiredNamespaces
    : proposal.optionalNamespaces || {};

  const chains = [...(requested?.eip155?.chains || []), ...(requested?.eip155?.optionalChains || [])].filter(Boolean);
  const methods = (requested?.eip155?.methods || []).filter(Boolean);
  const readableChains = chains.length
    ? chains.map((chain: string) => {
        const parsed = Number(String(chain).replace("eip155:", ""));
        const found = getAllNetworks().find((item) => Number(item.chainId) === parsed) || makeNetworkFromChainId(parsed);
        return {
          label: found ? found.name : `Chain ${parsed}`,
          chain,
          logo: found?.logo || "",
          symbol: found?.symbol || "ETH",
        };
      })
    : [{ label: "Multi-chain access", chain: "eip155:*", logo: "", symbol: "*" }];

  const url = proposal.proposerUrl || "WalletConnect";

  return (
    <div style={overlayStyle}>
      <div style={{ width: "min(560px, calc(100vw - 24px))", background: bg, color: text, border: `1px solid ${border}`, borderRadius: 24, padding: 20, boxSizing: "border-box", boxShadow: isLight ? "0 24px 80px rgba(20,30,50,.14)" : "0 24px 80px rgba(0,0,0,.45)", maxHeight: "min(760px, calc(100vh - 24px))", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <LogoImage src={resolveDappAsset(proposal.proposerIcons?.[0], proposal.proposerName)} alt={proposal.proposerName || "dApp"} kind="dapp" label={proposal.proposerName || "dApp"} size={48} rounded={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{t("wc_proposal_title")}</div>
            <div style={{ color: text, fontWeight: 800 }}>{proposal.proposerName}</div>
            <div style={{ color: sub, fontSize: 13, wordBreak: "break-all" }}>{url}</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 999, background: isLight ? "#fff7eb" : "rgba(255,176,32,.08)", border: "1px solid rgba(255,176,32,.22)", color: "#ffb020", fontWeight: 800, fontSize: 12 }}>REVIEW ACCESS</div>
        </div>

        <div style={panel(theme)}>
          <div style={row}><span style={{ color: sub }}>Connection type</span><strong>WalletConnect</strong></div>
          <div style={row}><span style={{ color: sub }}>Requested networks</span><strong>{readableChains.length}</strong></div>
          <div style={row}><span style={{ color: sub }}>Methods requested</span><strong>{methods.length || 1}</strong></div>
        </div>

        <div style={{ marginTop: 16, fontWeight: 800, marginBottom: 10 }}>{t("wc_proposal_requested_access")}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {readableChains.map((item) => (
            <div key={`${item.chain}-${item.label}`} style={card(theme)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LogoImage src={item.logo} alt={item.label} kind="network" label={item.label} symbol={item.symbol} size={28} />
                <div>
                  <div style={{ fontWeight: 800 }}>{item.label}</div>
                  <div style={{ color: sub, fontSize: 12 }}>{item.chain}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontWeight: 800, marginBottom: 10 }}>Methods</div>
        <div style={card(theme)}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(methods.length ? methods : ["eth_requestAccounts"]).map((method: string) => (
              <span key={method} style={pill(theme)}>{method}</span>
            ))}
          </div>
          <div style={{ color: sub, fontSize: 12, marginTop: 10, lineHeight: 1.45 }}>
            This approval saves the dApp permission in your wallet so it can be reviewed or revoked later in Settings.
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 16, background: isLight ? "#fff7eb" : "rgba(255,176,32,.08)", border: "1px solid rgba(255,176,32,.22)", color: sub, lineHeight: 1.5 }}>
          Approve only if you trust this app, recognize the requested methods and expect it to access the networks above.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, position: "sticky", bottom: 0, paddingTop: 12, background: bg }}>
          <button style={secondaryBtn(theme)} onClick={onReject}>{t("wc_proposal_reject")}</button>
          <button style={primaryBtn()} onClick={onApprove}>{t("wc_proposal_approve")}</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 12 };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
function panel(theme: "dark" | "light"): React.CSSProperties { return { display: "grid", gap: 8, padding: 14, borderRadius: 16, background: theme === "light" ? "#f4f7fb" : "#0a1018", border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}` }; }
function card(theme: "dark" | "light"): React.CSSProperties { return { padding: 14, borderRadius: 16, background: theme === "light" ? "#f8fbff" : "#0d1420", border: `1px solid ${theme === "light" ? "#dde6f3" : "#223044"}` }; }
function pill(theme: "dark" | "light"): React.CSSProperties { return { padding: "6px 10px", borderRadius: 999, background: theme === "light" ? "#edf3ff" : "#16213b", color: theme === "light" ? "#234692" : "#8fb0ff", fontSize: 12, fontWeight: 800 }; }
function primaryBtn(): React.CSSProperties { return { flex: 1, height: 46, borderRadius: 14, border: "none", background: "#3f7cff", color: "#fff", fontWeight: 800, cursor: "pointer" }; }
function secondaryBtn(theme: "dark" | "light"): React.CSSProperties { return { flex: 1, height: 46, borderRadius: 14, border: `1px solid ${theme === "light" ? "#d3dceb" : "#2c3950"}`, background: "transparent", color: theme === "light" ? "#10131a" : "#fff", fontWeight: 800, cursor: "pointer" }; }
