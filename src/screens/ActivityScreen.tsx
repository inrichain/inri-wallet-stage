import React, { useMemo } from "react";
import { getStoredNetwork } from "../lib/network";
import { tr } from "../i18n/translations";

const ACTIVITY_KEY = "wallet_activity_demo";

export default function ActivityScreen({
  theme = "dark",
  lang = "en",
  address,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
}) {
  const isLight = theme === "light";
  const network = getStoredNetwork();

  const items = useMemo(() => {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    return raw
      .filter(
        (item: any) =>
          item.from?.toLowerCase() === address.toLowerCase() ||
          item.to?.toLowerCase() === address.toLowerCase()
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
  }, [address]);

  function priorityLabel(priority: string) {
    if (priority === "high") return tr(lang, "activity_priority_high");
    if (priority === "low") return tr(lang, "activity_priority_low");
    return tr(lang, "activity_priority_normal");
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          borderRadius: 20,
          background: isLight ? "#ffffff" : "#121621",
          padding: 16,
        }}
      >
        <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>
          {tr(lang, "activity_title")}
        </h2>
        <div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3" }}>
          {tr(lang, "activity_subtitle")}
        </div>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
            borderRadius: 20,
            background: isLight ? "#ffffff" : "#121621",
            padding: 18,
            color: isLight ? "#5b6578" : "#97a0b3",
          }}
        >
          {tr(lang, "activity_empty")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item: any, index: number) => {
            const isOutgoing = item.from?.toLowerCase() === address.toLowerCase();
            const txHash = item.hash || "";

            return (
              <div
                key={item.hash || index}
                style={{
                  border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                  borderRadius: 18,
                  background: isLight ? "#ffffff" : "#121621",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: isLight ? "#10131a" : "#ffffff",
                        fontSize: 17,
                      }}
                    >
                      {isOutgoing
                        ? tr(lang, "activity_sent")
                        : tr(lang, "activity_received")}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: isLight ? "#5b6578" : "#97a0b3",
                        fontSize: 13,
                      }}
                    >
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: isLight ? "#edf3ff" : "#18233e",
                      color: "#3f7cff",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {item.status === "failed"
                      ? tr(lang, "activity_failed")
                      : item.status === "pending"
                      ? tr(lang, "activity_pending")
                      : tr(lang, "activity_confirmed")}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      color: isLight ? "#10131a" : "#ffffff",
                      fontSize: 24,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.amount} {item.symbol}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 999,
                      background: isLight ? "#f1f5f9" : "#0f172a",
                      color: isLight ? "#475569" : "#cbd5e1",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <img
                      src={network.logo}
                      alt={network.name}
                      style={{ width: 18, height: 18, borderRadius: 9 }}
                    />
                    {item.networkName || network.name}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <InfoRow
                    label={isOutgoing ? tr(lang, "activity_to") : tr(lang, "activity_from")}
                    value={isOutgoing ? item.to : item.from}
                    isLight={isLight}
                    mono
                  />
                  <InfoRow
                    label={tr(lang, "activity_hash")}
                    value={txHash}
                    isLight={isLight}
                    mono
                  />
                  <InfoRow
                    label={tr(lang, "activity_gas_used")}
                    value={String(item.gasUsed || "-")}
                    isLight={isLight}
                  />
                  <InfoRow
                    label={tr(lang, "activity_gas_price")}
                    value={
                      item.gasPriceGwei && item.gasPriceGwei !== "pending"
                        ? `${item.gasPriceGwei} Gwei`
                        : "-"
                    }
                    isLight={isLight}
                  />
                  <InfoRow
                    label={tr(lang, "activity_fee")}
                    value={
                      item.feeNative && item.feeNative !== "pending"
                        ? `${item.feeNative} ${network.symbol}`
                        : "-"
                    }
                    isLight={isLight}
                  />
                  <InfoRow
                    label={tr(lang, "activity_priority")}
                    value={priorityLabel(item.priority || "normal")}
                    isLight={isLight}
                  />
                </div>

                {txHash ? (
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={`${network.explorerTxUrl}${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={actionLink(isLight)}
                    >
                      {tr(lang, "activity_open_explorer")}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  isLight,
  mono = false,
}: {
  label: string;
  value: string;
  isLight: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`,
        borderRadius: 14,
        padding: "12px 14px",
        background: isLight ? "#f8fafc" : "#0b1120",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: isLight ? "#64748b" : "#94a3b8",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: isLight ? "#10131a" : "#fff",
          fontSize: 13,
          fontWeight: 700,
          wordBreak: "break-all",
          overflowWrap: "anywhere",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function actionLink(isLight: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f8faff" : "#0d111b",
    color: isLight ? "#10131a" : "#fff",
    fontWeight: 800,
    textDecoration: "none",
  };
}
