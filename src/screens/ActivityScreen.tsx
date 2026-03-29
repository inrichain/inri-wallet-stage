import React, { useEffect, useMemo, useState } from "react";
import { getAllNetworks, getStoredNetwork } from "../lib/network";
import { tr } from "../i18n/translations";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import LogoImage from "../components/LogoImage";

const ACTIVITY_KEY = "wallet_activity_demo";

export default function ActivityScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);

  useEffect(() => {
    const sync = () => setNetworkKey(getStoredNetwork().key);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
  }, []);

  const allNetworks = useMemo(() => getAllNetworks({ includeHidden: true }), []);
  const activeNetwork = useMemo(() => allNetworks.find((entry) => entry.key === networkKey) || getStoredNetwork(), [allNetworks, networkKey]);

  function resolveActivityNetworkKey(item: any) {
    if (item?.networkKey) return String(item.networkKey);
    const chain = String(item?.chainId || "").toLowerCase();
    const name = String(item?.networkName || "").toLowerCase();
    if (chain === "3777" || chain === "inri" || name.includes("inri")) return "inri";
    if (chain === "137" || chain === "polygon" || name.includes("polygon")) return "polygon";
    const hit = allNetworks.find((entry) => String(entry.chainId) === String(item?.chainId) || String(entry.name).toLowerCase() === name);
    return hit?.key || null;
  }

  const items = useMemo(() => {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    return raw
      .filter((item: any) => item.from?.toLowerCase() === address.toLowerCase() || item.to?.toLowerCase() === address.toLowerCase())
      .filter((item: any) => resolveActivityNetworkKey(item) === String(networkKey))
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [address, networkKey, allNetworks]);

  function priorityLabel(priority: string) {
    if (priority === "high") return tr(lang, "activity_priority_high");
    if (priority === "low") return tr(lang, "activity_priority_low");
    return tr(lang, "activity_priority_normal");
  }

  function statusTone(status: string) {
    if (status === "failed") return "danger" as const;
    if (status === "pending") return "warning" as const;
    return "success" as const;
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title={tr(lang, "activity_title")} subtitle={tr(lang, "activity_subtitle")} theme={theme} />
      </ScreenCard>

      {items.length === 0 ? (
        <EmptyState theme={theme} title={tr(lang, "activity_empty")} description="Transfers, swaps and approvals will appear here once you start using the wallet." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item: any, index: number) => {
            const isOutgoing = item.from?.toLowerCase() === address.toLowerCase();
            const txHash = item.hash || "";
            const itemNetwork = allNetworks.find((entry) => entry.key === resolveActivityNetworkKey(item) || Number(entry.chainId) === Number(item.chainId)) || activeNetwork;
            const title = item.method === "approve" ? `Approve ${item.symbol || "token"}` : isOutgoing ? tr(lang, "activity_sent") : tr(lang, "activity_received");
            return (
              <ScreenCard key={item.hash || index} theme={theme}>
                <div className="wallet-section-head">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 18 }}>{title}</div>
                    <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <StatusPill theme={theme} tone={statusTone(item.status)}>
                    {item.status === "failed" ? tr(lang, "activity_failed") : item.status === "pending" ? tr(lang, "activity_pending") : tr(lang, "activity_confirmed")}
                  </StatusPill>
                </div>

                <div className="wallet-activity-summary">
                  <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 28, overflowWrap: "anywhere" }}>{item.amount} {item.symbol}</div>
                  <div className="wallet-mini-stat" style={{ background: isLight ? "#f1f5f9" : "#0f172a", color: isLight ? "#475569" : "#cbd5e1" }}>
                    <LogoImage src={itemNetwork.logo} alt={itemNetwork.name} kind="network" label={itemNetwork.name} symbol={itemNetwork.symbol} size={18} />
                    <span>{item.networkName || itemNetwork.name}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <InfoRow label={isOutgoing ? tr(lang, "activity_to") : tr(lang, "activity_from")} value={isOutgoing ? item.to : item.from} isLight={isLight} mono />
                  <InfoRow label={tr(lang, "activity_hash")} value={txHash} isLight={isLight} mono />
                  <InfoRow label={tr(lang, "activity_gas_used")} value={String(item.gasUsed || "-")} isLight={isLight} />
                  <InfoRow label={tr(lang, "activity_gas_price")} value={item.gasPriceGwei && item.gasPriceGwei !== "pending" ? `${item.gasPriceGwei} Gwei` : "-"} isLight={isLight} />
                  <InfoRow label={tr(lang, "activity_fee")} value={item.feeNative && item.feeNative !== "pending" ? `${item.feeNative} ${itemNetwork.symbol}` : "-"} isLight={isLight} />
                  <InfoRow label={tr(lang, "activity_priority")} value={priorityLabel(item.priority || "normal")} isLight={isLight} />
                </div>

                {txHash ? (
                  <div className="wallet-action-row">
                    <a href={`${itemNetwork.explorerTxUrl}${txHash}`} target="_blank" rel="noreferrer" className="wallet-link-chip">
                      {tr(lang, "activity_open_explorer")}
                    </a>
                  </div>
                ) : null}
              </ScreenCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, isLight, mono = false }: { label: string; value: string; isLight: boolean; mono?: boolean; }) {
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 14, padding: "12px 14px", background: isLight ? "#f8fafc" : "#0b1120" }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8", marginBottom: 6 }}>{label}</div>
      <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", wordBreak: mono ? "break-all" : "break-word", fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", fontSize: 14 }}>{value || "-"}</div>
    </div>
  );
}
