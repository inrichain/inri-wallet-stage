import React from "react";
import { tr } from "../i18n/translations";
import { buildWcRequestDetails } from "../lib/wcRequestDetails";

type Props = {
  open: boolean;
  theme: "dark" | "light";
  lang?: string;
  request: any | null;
  approving?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export default function WcRequestModal({
  open,
  theme,
  lang = "en",
  request,
  approving = false,
  onApprove,
  onReject,
}: Props) {
  if (!open || !request) return null;

  const text = theme === "light" ? "#10131a" : "#fff";
  const sub = theme === "light" ? "#5f6b7d" : "#9aa4b5";
  const details = buildWcRequestDetails(request, lang);
  const t = (key: string) => tr(lang, key);

  return (
    <div style={overlayStyle}>
      <div style={panelStyle(theme)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {details.networkLogo ? (
            <img
              src={details.networkLogo}
              alt={details.networkName}
              style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }}
            />
          ) : (
            <div style={iconFallback(theme)}>{details.networkName.slice(0, 1).toUpperCase()}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{details.title}</div>
            <div style={{ color: sub, fontSize: 14, lineHeight: 1.4 }}>{details.subtitle}</div>
            <div style={{ color: text, fontWeight: 700, marginTop: 4 }}>{details.dappName}</div>
            {!!details.dappUrl && (
              <div style={{ color: sub, fontSize: 13, wordBreak: "break-all" }}>{details.dappUrl}</div>
            )}
          </div>
        </div>

        <div style={heroBox(theme)}>
          <InfoRow label={t("wc_request_method")} value={details.displayMethod || details.methodLabel || details.method} text={text} sub={sub} />
          <InfoRow label={t("wc_request_network")} value={details.networkName} text={text} sub={sub} />
          <InfoRow label={t("wc_request_chain")} value={details.chainLabel} text={text} sub={sub} />
        </div>

        {details.kind === "transaction" && (
          <>
            <SectionTitle text={t("wc_request_transaction_details")} />
            <div style={gridStyle}>
              <Card theme={theme} label={t("wc_request_to")} value={details.to} hint={details.toFull || t("wc_request_destination_address")} />
              <Card theme={theme} label={t("wc_request_value")} value={details.valueNative} hint={t("wc_request_native_asset_amount")} />
              <Card theme={theme} label={t("wc_request_gas_limit")} value={details.gasLimit} hint={t("wc_request_requested_execution_gas")} />
              <Card
                theme={theme}
                label={t("wc_request_estimated_fee")}
                value={details.estimatedFeeNative}
                hint={details.maxFeePerGas !== "-" ? `Max fee ${details.maxFeePerGas}` : t("wc_request_network_estimate")}
              />
              <Card
                theme={theme}
                label={t("wc_request_priority_fee")}
                value={details.maxPriorityFeePerGas}
                hint={details.gasPrice !== "-" ? `Legacy gas ${details.gasPrice}` : t("wc_request_eip_legacy")}
              />
              <Card
                theme={theme}
                label={t("wc_request_interaction")}
                value={details.contractInteraction ? t("wc_request_contract_call") : t("wc_request_native_transfer")}
                hint={details.dataPreview}
              />
            </div>
          </>
        )}

        {details.kind === "message" && (
          <>
            <SectionTitle text={t("wc_request_message_preview")} />
            <pre style={preStyle(theme)}>{details.preview || t("wc_request_empty_message")}</pre>
          </>
        )}

        {details.kind === "typedData" && (
          <>
            <SectionTitle text={t("wc_request_typed_data_summary")} />
            <div style={gridStyle}>
              <Card theme={theme} label={t("wc_request_domain")} value={details.summary?.domainName || t("wc_details_unknown")} hint={t("wc_request_signing_domain")} />
              <Card theme={theme} label={t("wc_request_primary_type")} value={details.summary?.primaryType || t("wc_details_unknown")} hint={t("wc_request_main_structured_type")} />
              <Card
                theme={theme}
                label={t("wc_request_fields")}
                value={String(details.summary?.fieldCount || 0)}
                hint={(details.summary?.fields || []).join(", ") || t("wc_request_no_visible_fields")}
              />
            </div>
            <pre style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</pre>
          </>
        )}

        {details.kind === "raw" && <pre style={preStyle(theme)}>{JSON.stringify(request.params, null, 2)}</pre>}

        <SectionTitle text={t("wc_request_security_notice")} />
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
            {t("wc_request_reject")}
          </button>
          <button style={primaryBtn(approving)} onClick={onApprove} disabled={approving}>
            {approving ? t("wc_request_approving") : t("wc_request_approve")}
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

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: "none",
    background: disabled ? "#6f89c9" : "#3f7cff",
    color: "#fff",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.85 : 1,
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
    cursor: "pointer",
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
