import React from "react";
import { tr } from "../i18n/translations";
import { buildWcRequestDetails } from "../lib/wcRequestDetails";
import { resolveDappAsset } from "../lib/assets";
import LogoImage from "./LogoImage";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  lang?: string;
  request: any | null;
  approving?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export default function WcRequestModal({ open, theme, lang = "en", request, approving = false, onApprove, onReject }: Props) {
  if (!open || !request) return null;

  const text = theme === "light" ? "#10131a" : "#fff";
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";
  const details = buildWcRequestDetails(request, lang);
  const t = (key: string) => tr(lang, key);

  return (
    <div style={overlayStyle}>
      <div style={panelStyle(theme)}>
        <div style={{ ...heroBox(theme), marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <LogoImage src={resolveDappAsset(details.dappIcon, details.dappName)} alt={details.dappName} kind="dapp" label={details.dappName} size={46} rounded={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{details.title}</div>
            <div style={{ color: sub, fontSize: 14, lineHeight: 1.4 }}>{details.subtitle}</div>
            <div style={{ color: text, fontWeight: 700, marginTop: 4 }}>{details.dappName}</div>
            {!!details.dappUrl && <div style={{ color: sub, fontSize: 13, wordBreak: "break-all" }}>{details.dappUrl}</div>}
          </div>
          </div>
          <RiskPill theme={theme} level={details.riskLevel || details.analysis?.riskLevel || "medium"} />
        </div>

        <div style={{...heroBox(theme), background: theme === "light" ? "#f8fbff" : "#0b111b"}}>
          <InfoRow label="Requested by" value={details.dappName} text={text} sub={sub} />
          <InfoRow label={t("wc_request_method")} value={details.displayMethod || details.methodLabel || details.method} text={text} sub={sub} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: sub }}>{t("wc_request_network")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LogoImage src={details.networkLogo} alt={details.networkName} kind="network" label={details.networkName} symbol={(details as any).networkSymbol} size={20} />
              <strong style={{ color: text }}>{details.networkName}</strong>
            </div>
          </div>
          <InfoRow label={t("wc_request_chain")} value={details.chainLabel} text={text} sub={sub} />
        </div>

        {details.kind === "transaction" && (
          <>
            {details.analysis ? (
              <>
                <SectionTitle text="Action summary" />
                <div style={gridStyle}>
                  <Card theme={theme} label="Action" value={details.analysis.action} hint={details.analysis.functionName} />
                  <Card theme={theme} label="Risk" value={String(details.analysis.riskLevel).toUpperCase()} hint={details.analysis.isUnlimitedApproval ? "Unlimited approval detected" : ""} />
                  {details.analysis.spender ? <Card theme={theme} label="Spender" value={details.analysis.spender} hint="Address allowed by this request" /> : null}
                  {details.analysis.amountLabel ? <Card theme={theme} label="Amount" value={details.analysis.amountLabel} hint="Decoded from calldata" /> : null}
                </div>
              </>
            ) : null}
            <SectionTitle text={t("wc_request_transaction_details")} />
            <div style={gridStyle}>
              <Card theme={theme} label={t("wc_request_to")} value={details.to} hint={details.toFull || t("wc_request_destination_address")} />
              <Card theme={theme} label={t("wc_request_value")} value={details.valueNative} hint={t("wc_request_native_asset_amount")} />
              <Card theme={theme} label={t("wc_request_gas_limit")} value={details.gasLimit} hint={t("wc_request_requested_execution_gas")} />
              <Card theme={theme} label={t("wc_request_estimated_fee")} value={details.estimatedFeeNative} hint={details.maxFeePerGas !== "-" ? `Max fee ${details.maxFeePerGas}` : t("wc_request_network_estimate")} />
              <Card theme={theme} label={t("wc_request_priority_fee")} value={details.maxPriorityFeePerGas} hint={details.gasPrice !== "-" ? `Legacy gas ${details.gasPrice}` : t("wc_request_eip_legacy")} />
              <Card theme={theme} label={t("wc_request_interaction")} value={details.contractInteraction ? t("wc_request_contract_call") : t("wc_request_native_transfer")} hint={details.dataPreview} />
            </div>
            {details.analysis?.fields?.length ? (
              <>
                <SectionTitle text="Decoded calldata" />
                <div style={gridStyle}>
                  {details.analysis.fields.map((field: any, index: number) => <Card key={index} theme={theme} label={field.label} value={field.value} />)}
                </div>
              </>
            ) : null}
          </>
        )}

        {details.kind === "networkSwitch" && (
          <>
            <SectionTitle text="Network request" />
            <div style={gridStyle}>
              <Card theme={theme} label="Current network" value={details.currentNetwork || details.networkName} />
              <Card theme={theme} label="Requested network" value={details.requestedNetwork || "Unknown"} />
              <Card theme={theme} label="Requested chain" value={String(details.requestedChainId || "-")} hint="Verify before switching" />
            </div>
          </>
        )}

        {details.kind === "networkAdd" && (
          <>
            <SectionTitle text="Add custom network" />
            <div style={gridStyle}>
              <Card theme={theme} label="Network" value={details.requestedNetwork || "Custom network"} />
              <Card theme={theme} label="Chain ID" value={String(details.requestedChainId || "-")} />
              <Card theme={theme} label="RPC URL" value={details.requestedRpc || "-"} hint="Make sure the RPC is trusted" />
            </div>
          </>
        )}

        {details.kind === "message" && (<><SectionTitle text={t("wc_request_message_preview")} /><pre style={preStyle(theme)}>{details.preview || t("wc_request_empty_message")}</pre></>)}
        {details.kind === "typedData" && (
          <>
            <SectionTitle text={t("wc_request_typed_data_summary")} />
            <div style={gridStyle}>
              <Card theme={theme} label={t("wc_request_domain")} value={details.summary?.domainName || t("wc_details_unknown")} hint={t("wc_request_signing_domain")} />
              <Card theme={theme} label={t("wc_request_primary_type")} value={details.summary?.primaryType || t("wc_details_unknown")} hint={t("wc_request_main_structured_type")} />
              <Card theme={theme} label={t("wc_request_fields")} value={String(details.summary?.fieldCount || 0)} hint={(details.summary?.fields || []).join(", ") || t("wc_request_no_visible_fields")} />
              {details.analysis?.action ? <Card theme={theme} label="Decoded intent" value={details.analysis.action} hint={details.analysis.functionName} /> : null}
            </div>
            <pre style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</pre>
          </>
        )}
        {details.kind === "raw" && <pre style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</pre>}

        <SectionTitle text={t("wc_request_security_notice")} />
        <div style={riskBox(theme, details.riskLevel || details.analysis?.riskLevel || "medium")}>
          {details.riskItems.map((item: string, index: number) => (
            <div key={index} style={{ display: "flex", gap: 8, color: sub, lineHeight: 1.45 }}>
              <span style={{ color: (details.riskLevel || details.analysis?.riskLevel) === "high" ? "#ff7b7b" : "#ffb020", fontWeight: 900 }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button style={secondaryBtn(theme)} onClick={onReject} disabled={approving}>{t("wc_request_reject")}</button>
          <button style={primaryBtn(approving)} onClick={onApprove} disabled={approving}>{approving ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Spinner /> {t("wc_request_approving")}</span> : buttonLabel(details.kind, t)}</button>
        </div>
      </div>
    </div>
  );
}

function buttonLabel(kind: string, t: (key: string) => string) {
  if (kind === "networkSwitch") return "Switch network";
  if (kind === "networkAdd") return "Add network";
  if (kind === "message") return "Sign message";
  if (kind === "typedData") return "Sign typed data";
  if (kind === "transaction") return "Approve transaction";
  return t("wc_request_approve");
}
function Spinner() { return <span style={{ width: 14, height: 14, borderRadius: 999, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", display: "inline-block", animation: "inri-spin .8s linear infinite" }} />; }
function RiskPill({ theme, level }: { theme: "dark" | "light"; level: string }) { const label = String(level || "medium").toUpperCase(); const tone = label === "HIGH" ? { bg: theme === "light" ? "#fff1f1" : "rgba(255,123,123,.12)", bd: "rgba(255,123,123,.35)", fg: "#ff7b7b" } : label === "LOW" ? { bg: theme === "light" ? "#eefaf1" : "rgba(74,222,128,.1)", bd: "rgba(74,222,128,.25)", fg: "#6ee7a6" } : { bg: theme === "light" ? "#fff7eb" : "rgba(255,176,32,.08)", bd: "rgba(255,176,32,.22)", fg: "#ffb020" }; return <div style={{ padding: "8px 10px", borderRadius: 999, background: tone.bg, border: `1px solid ${tone.bd}`, color: tone.fg, fontWeight: 800, fontSize: 12 }}>{label} RISK</div>; }
function SectionTitle({ text }: { text: string }) { return <div style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 10px" }}>{text}</div>; }
function InfoRow({ label, value, text, sub }: { label: string; value: string; text: string; sub: string; }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span style={{ color: sub }}>{label}</span><strong style={{ color: text, textAlign: "right" }}>{value}</strong></div>; }
function Card({ theme, label, value, hint }: { theme: "dark" | "light"; label: string; value: string; hint?: string; }) { const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5"; const text = theme === "light" ? "#10131a" : "#fff"; return <div style={cardStyle(theme)}><div style={{ color: sub, fontSize: 12, marginBottom: 6 }}>{label}</div><div style={{ color: text, fontSize: 15, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>{value}</div>{hint ? <div style={{ color: sub, fontSize: 12, marginTop: 6, lineHeight: 1.35 }}>{hint}</div> : null}</div>; }
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 12 };
function panelStyle(theme: "dark" | "light"): React.CSSProperties { return { width: "min(720px, calc(100vw - 24px))", maxHeight: "calc(100vh - 24px)", overflow: "auto", background: theme === "light" ? "#fff" : "#111722", color: theme === "light" ? "#10131a" : "#fff", border: `1px solid ${theme === "light" ? "#dbe2ef" : "#273042"}`, borderRadius: 24, padding: 20, boxSizing: "border-box", boxShadow: theme === "light" ? "0 24px 80px rgba(20,30,50,.14)" : "0 24px 80px rgba(0,0,0,.45)" }; }
function heroBox(theme: "dark" | "light"): React.CSSProperties { return { display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10, padding: 16, borderRadius: 20, background: theme === "light" ? "linear-gradient(180deg,#ffffff 0%,#f7faff 100%)" : "linear-gradient(180deg,#131b29 0%,#0e1522 100%)", border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}` }; }
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 };
function cardStyle(theme: "dark" | "light"): React.CSSProperties { return { padding: 14, borderRadius: 16, background: theme === "light" ? "#f8fbff" : "#0d1420", border: `1px solid ${theme === "light" ? "#dde6f3" : "#223044"}` }; }
function riskBox(theme: "dark" | "light", level: string): React.CSSProperties { const high = String(level) === "high"; return { display: "grid", gap: 8, padding: 14, borderRadius: 16, background: high ? (theme === "light" ? "#fff3f3" : "rgba(255,123,123,.1)") : theme === "light" ? "#fff7eb" : "rgba(255,176,32,.08)", border: `1px solid ${high ? (theme === "light" ? "#ffc6c6" : "rgba(255,123,123,.22)") : theme === "light" ? "#ffe0ae" : "rgba(255,176,32,.22)"}` }; }
function preStyle(theme: "dark" | "light"): React.CSSProperties { return { background: theme === "light" ? "#f4f7fb" : "#0a0f18", border: `1px solid ${theme === "light" ? "#dbe3f0" : "#243045"}`, borderRadius: 14, padding: 12, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }; }
function primaryBtn(loading: boolean): React.CSSProperties { return { flex: 1, height: 46, borderRadius: 14, border: "none", background: loading ? "#7da8ff" : "#3f7cff", color: "#fff", fontWeight: 800, cursor: loading ? "default" : "pointer" }; }
function secondaryBtn(theme: "dark" | "light"): React.CSSProperties { return { flex: 1, height: 46, borderRadius: 14, border: `1px solid ${theme === "light" ? "#d3dceb" : "#2c3950"}`, background: "transparent", color: theme === "light" ? "#10131a" : "#fff", fontWeight: 800, cursor: "pointer" }; }
