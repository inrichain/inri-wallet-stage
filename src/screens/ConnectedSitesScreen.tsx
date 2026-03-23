import React from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import { listSitePermissions, revokeSitePermission, revokeAllSitePermissions } from "../lib/sitePermissions";
import { getActiveSessions, disconnectSession } from "../lib/walletconnect";

export default function ConnectedSitesScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const perms = listSitePermissions();
  const sessions = getActiveSessions();
  const border = `1px solid ${theme === "light" ? "#e8edf5" : "#1b2230"}`;
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Connected Sites" subtitle="Review dapp permissions and WalletConnect sessions in one place." theme={theme} />
        <div className="wallet-action-row">
          <StatusPill theme={theme} tone="primary">{perms.length} sites</StatusPill>
          <StatusPill theme={theme}>{sessions.length} WC sessions</StatusPill>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="Browser permissions" subtitle="Saved permissions from dapps using the injected provider." theme={theme} compact />
        {perms.length === 0 ? (
          <div className="wallet-empty-state"><div className="wallet-empty-state-title">No sites connected</div></div>
        ) : (
          <>
            {perms.map((p, idx) => (
              <div key={p.id} style={{ padding: "14px 0", borderBottom: idx === perms.length - 1 ? "none" : border }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{p.name || p.origin}</div>
                    <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{p.origin}</div>
                  </div>
                  <button className="wallet-btn secondary" onClick={() => { revokeSitePermission(p.id); location.reload(); }}>Disconnect</button>
                </div>
              </div>
            ))}
            <div className="wallet-action-row" style={{ marginTop: 12 }}>
              <button className="wallet-btn secondary" onClick={() => { revokeAllSitePermissions(); location.reload(); }}>Disconnect all sites</button>
            </div>
          </>
        )}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="WalletConnect" subtitle="Active WalletConnect connections." theme={theme} compact />
        {sessions.length === 0 ? (
          <div className="wallet-empty-state"><div className="wallet-empty-state-title">No WalletConnect sessions</div></div>
        ) : sessions.map((s, idx) => (
          <div key={s.topic} style={{ padding: "14px 0", borderBottom: idx === sessions.length - 1 ? "none" : border }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{s.name || "WalletConnect app"}</div>
                <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{s.topic}</div>
              </div>
              <button className="wallet-btn secondary" onClick={async () => { try { await disconnectSession(s.topic); } finally { location.reload(); } }}>Disconnect</button>
            </div>
          </div>
        ))}
      </ScreenCard>
    </div>
  );
}
