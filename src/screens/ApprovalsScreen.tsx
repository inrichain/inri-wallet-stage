import React, { useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import EmptyState from "../components/EmptyState";
import ActionButton from "../components/ActionButton";
import StatusPill from "../components/StatusPill";

const ACTIVITY_KEY = "wallet_activity_demo";

function readApprovalActivity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item: any) => item?.method === "approve") : [];
  } catch {
    return [];
  }
}

export default function ApprovalsScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const [query, setQuery] = useState("");
  const approvals = useMemo(() => readApprovalActivity(), []);
  const filtered = useMemo(() => approvals.filter((item: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.symbol, item.tokenAddress, item.to, item.from, item.hash].join(" ").toLowerCase().includes(q);
  }), [approvals, query]);

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Approval manager" subtitle="A clean place to review token approvals now and wire revoke flows later." theme={theme} actions={<StatusPill theme={theme} tone="warning">Ready for revoke</StatusPill>} />
        <div className="wallet-action-row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="wallet-ui-input" placeholder="Search by token, spender or hash" style={{ flex: 1 }} />
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="Recorded approvals" subtitle="Pulled from local wallet activity until direct onchain allowance indexing is added." theme={theme} compact />
        {!filtered.length ? <EmptyState theme={theme} title="No approvals recorded" description="As approvals happen in Swap, Bridge and P2P, they can be surfaced here before full revoke tooling is attached." /> : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((item: any, index: number) => (
              <div key={`${item.hash || 'approve'}-${index}`} className="wallet-list-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>Approve {item.symbol || "token"}</div>
                    <StatusPill theme={theme}>{item.networkKey || item.networkName || "network"}</StatusPill>
                  </div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>Spender: {item.to || "-"}</div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4, wordBreak: "break-all" }}>Tx: {item.hash || "pending"}</div>
                </div>
                <ActionButton theme={theme} tone="ghost" compact disabled>Revoke later</ActionButton>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>
    </div>
  );
}
