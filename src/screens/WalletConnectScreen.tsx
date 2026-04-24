import React, { useEffect, useRef, useState } from "react";
import { pairWalletConnect, getActiveSessions, disconnectSession, disconnectAllSessions } from "../lib/walletconnect";
import { listSitePermissions, revokeSitePermission, revokeAllSitePermissions } from "../lib/sitePermissions";
import WalletConnectQrScanner from "../components/WalletConnectQrScanner";

export default function WalletConnectScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const isLight = theme === "light";
  const [wcUri, setWcUri] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [permissions, setPermissions] = useState(listSitePermissions().filter((item) => item.type === "walletconnect"));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const messageTimer = useRef<number | null>(null);

  function showMessage(text: string) {
    setMessage(text);
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(""), 2400);
  }

  function refresh() {
    setSessions(getActiveSessions());
    setPermissions(listSitePermissions().filter((item) => item.type === "walletconnect"));
  }

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 2500);
    const sync = () => refresh();
    window.addEventListener("wallet-site-permissions-updated", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("wallet-site-permissions-updated", sync);
      if (messageTimer.current) window.clearTimeout(messageTimer.current);
    };
  }, []);

  async function connect() {
    if (!wcUri.trim()) return showMessage("WalletConnect URI required");
    try {
      setLoading(true);
      await pairWalletConnect(wcUri.trim());
      setWcUri("");
      showMessage("Pair request sent");
      refresh();
    } catch (err: any) {
      showMessage(String(err?.message || err || "Connection failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={titleStyle(isLight)}>WalletConnect</div>
        <div style={subtitleStyle(isLight)}>Pair dapps here instead of overloading Settings. This keeps connection management in one stable place.</div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>New connection</div>
        <div style={{ display: "grid", gap: 10 }}>
          <textarea value={wcUri} onChange={(e) => setWcUri(e.target.value)} placeholder="Paste WalletConnect URI" style={textareaStyle(isLight)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={connect} style={primaryButtonStyle()} disabled={loading}>{loading ? "Connecting..." : "Connect"}</button>
            <button onClick={() => setScannerOpen(true)} style={ghostButton(isLight)}>Scan QR</button>
            <button onClick={refresh} style={ghostButton(isLight)}>Refresh</button>
            <button onClick={async () => { await disconnectAllSessions(); refresh(); showMessage("All sessions disconnected"); }} style={ghostButton(isLight)}>Disconnect all</button>
          </div>
          {message ? <div style={{ color: "#3f7cff", fontWeight: 800 }}>{message}</div> : null}
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Active sessions</div>
        <div style={{ display: "grid", gap: 8 }}>
          {sessions.length === 0 ? <div style={subtitleStyle(isLight)}>No active WalletConnect sessions.</div> : null}
          {sessions.map((session) => (
            <div key={session.topic} style={rowStyle(isLight)}>
              <div>
                <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{session.name || "Unknown dApp"}</div>
                <div style={subtitleStyle(isLight)}>{session.url || session.topic}</div>
                <div style={subtitleStyle(isLight)}>Topic: {session.topic}</div>
              </div>
              <button onClick={async () => { await disconnectSession(session.topic); refresh(); showMessage("Session disconnected"); }} style={ghostButton(isLight)}>Disconnect</button>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Approved sites</div>
        <div style={{ display: "grid", gap: 8 }}>
          {permissions.length === 0 ? <div style={subtitleStyle(isLight)}>No WalletConnect site permissions saved.</div> : null}
          {permissions.map((item) => (
            <div key={item.id} style={rowStyle(isLight)}>
              <div>
                <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>{item.name}</div>
                <div style={subtitleStyle(isLight)}>{item.origin}</div>
              </div>
              <button onClick={() => { revokeSitePermission(item.id); refresh(); }} style={ghostButton(isLight)}>Revoke</button>
            </div>
          ))}
          {permissions.length ? <button onClick={() => { revokeAllSitePermissions(); refresh(); showMessage("All permissions revoked"); }} style={ghostButton(isLight)}>Revoke all permissions</button> : null}
        </div>
      </section>

      <WalletConnectQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={(value) => { setWcUri(value); setScannerOpen(false); }} theme={theme} />
    </div>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 }; }
function titleStyle(isLight: boolean): React.CSSProperties { return { fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }; }
function sectionTitleStyle(isLight: boolean): React.CSSProperties { return { fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", marginBottom: 12 }; }
function subtitleStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13 }; }
function textareaStyle(isLight: boolean): React.CSSProperties { return { width: "100%", minHeight: 110, padding: "12px 14px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0d1420", color: isLight ? "#10131a" : "#ffffff", boxSizing: "border-box", resize: "vertical" }; }
function primaryButtonStyle(): React.CSSProperties { return { padding: "12px 14px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function ghostButton(isLight: boolean): React.CSSProperties { return { padding: "11px 13px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, background: isLight ? "#f8fbff" : "#0f1520", color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, cursor: "pointer" }; }
function rowStyle(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`, background: isLight ? "#f8fbff" : "#0f1520" }; }
