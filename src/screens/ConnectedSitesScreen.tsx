import React, { useEffect, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import { listSitePermissions, revokeAllSitePermissions, revokeSitePermission, type SitePermission } from "../lib/sitePermissions";
import { disconnectAllSessions, disconnectSession, getActiveSessions } from "../lib/walletconnect";

export default function ConnectedSitesScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const [sites, setSites] = useState<SitePermission[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  function refresh() {
    setSites(listSitePermissions());
    setSessions(getActiveSessions());
  }

  useEffect(() => {
    refresh();
    const sync = () => refresh();
    window.addEventListener("wallet-site-permissions-updated", sync);
    return () => window.removeEventListener("wallet-site-permissions-updated", sync);
  }, []);

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Connected sites" subtitle="Manage browser and WalletConnect access from one place." theme={theme} actions={<StatusPill theme={theme} tone="primary">Security</StatusPill>} />
        <div className="wallet-action-row">
          <ActionButton theme={theme} tone="ghost" onClick={refresh}>Refresh</ActionButton>
          <ActionButton theme={theme} tone="danger" onClick={() => { revokeAllSitePermissions(); disconnectAllSessions(); refresh(); }}>Disconnect all</ActionButton>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="Approved permissions" subtitle="Each origin, chain and method currently trusted by the wallet." theme={theme} compact />
        {!sites.length ? <EmptyState theme={theme} title="No connected sites" description="Browser dapps and WalletConnect sessions will appear here once they request access." /> : (
          <div style={{ display: "grid", gap: 10 }}>
            {sites.map((item) => (
              <div key={item.id} className="wallet-list-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{item.name}</div>
                    <StatusPill theme={theme}>{item.type}</StatusPill>
                  </div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{item.origin}</div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>Chains: {item.chains.join(", ") || "-"} · Methods: {item.methods.slice(0, 4).join(", ") || "-"}</div>
                </div>
                <ActionButton theme={theme} tone="danger" compact onClick={() => { revokeSitePermission(item.id); refresh(); }}>Revoke</ActionButton>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="WalletConnect live sessions" subtitle="Realtime sessions that can still ask for signatures." theme={theme} compact />
        {!sessions.length ? <EmptyState theme={theme} title="No active sessions" description="When a dapp is connected through WalletConnect, it will appear here too." /> : (
          <div style={{ display: "grid", gap: 10 }}>
            {sessions.map((session) => (
              <div key={session.topic} className="wallet-list-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{session.name || "Unknown dApp"}</div>
                  <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{session.url || session.topic}</div>
                </div>
                <ActionButton theme={theme} tone="danger" compact onClick={async () => { await disconnectSession(session.topic); refresh(); }}>Disconnect</ActionButton>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>
    </div>
  );
}
