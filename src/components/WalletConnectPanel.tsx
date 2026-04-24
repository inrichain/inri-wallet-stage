import React, { useEffect, useState } from "react";
import {
  pairWalletConnect,
  getActiveSessions,
  disconnectSession,
  disconnectAllSessions,
} from "../lib/walletconnect";

type Props = {
  theme: "dark" | "light";
  onMessage?: (text: string) => void;
};

export default function WalletConnectPanel({ theme, onMessage }: Props) {
  const [uri, setUri] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function show(text: string) {
    if (onMessage) onMessage(text);
  }

  function refreshSessions() {
    try {
      const list = getActiveSessions();
      setSessions(list);
    } catch {
      setSessions([]);
    }
  }

  useEffect(() => {
    refreshSessions();
    const id = window.setInterval(refreshSessions, 1500);
    return () => window.clearInterval(id);
  }, []);

  async function handleConnect() {
    if (!uri.trim()) {
      show("Paste a WalletConnect URI");
      return;
    }

    setLoading(true);
    try {
      await pairWalletConnect(uri.trim());
      setUri("");
      refreshSessions();
      show("WalletConnect pairing started");
    } catch (err: any) {
      console.error(err);
      show(err?.message || "Failed to pair WalletConnect");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(topic: string) {
    setLoading(true);
    try {
      await disconnectSession(topic);
      refreshSessions();
      show("Session disconnected");
    } catch (err: any) {
      console.error(err);
      show(err?.message || "Failed to disconnect session");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnectAll() {
    setLoading(true);
    try {
      await disconnectAllSessions();
      refreshSessions();
      show("All sessions disconnected");
    } catch (err: any) {
      console.error(err);
      show(err?.message || "Failed to disconnect all sessions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: theme === "light" ? "#ffffff" : "#121621",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 8,
          color: theme === "light" ? "#10131a" : "#ffffff",
        }}
      >
        WalletConnect
      </div>

      <div
        style={{
          color: theme === "light" ? "#5b6578" : "#97a0b3",
          fontSize: 13,
          lineHeight: 1.45,
          marginBottom: 14,
        }}
      >
        Paste a WalletConnect URI starting with <strong>wc:</strong> to connect
        this wallet to a dApp.
      </div>

      <textarea
        value={uri}
        onChange={(e) => setUri(e.target.value)}
        placeholder="wc:..."
        style={{
          width: "100%",
          minHeight: 96,
          padding: 12,
          borderRadius: 14,
          border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
          background: theme === "light" ? "#f6f8fc" : "#0d111b",
          color: theme === "light" ? "#10131a" : "#ffffff",
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
          marginBottom: 12,
        }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "#3f7cff",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          {loading ? "Connecting..." : "Connect URI"}
        </button>

        <button
          onClick={refreshSessions}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
            background: theme === "light" ? "#ffffff" : "#1b2741",
            color: theme === "light" ? "#10131a" : "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Refresh
        </button>

        <button
          onClick={handleDisconnectAll}
          disabled={loading || sessions.length === 0}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
            background: theme === "light" ? "#ffffff" : "#1b2741",
            color: theme === "light" ? "#10131a" : "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Disconnect All
        </button>
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          marginBottom: 10,
          color: theme === "light" ? "#10131a" : "#ffffff",
        }}
      >
        Active Sessions
      </div>

      {sessions.length === 0 ? (
        <div
          style={{
            color: theme === "light" ? "#5b6578" : "#97a0b3",
            fontSize: 13,
          }}
        >
          No active WalletConnect sessions.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sessions.map((session) => (
            <div
              key={session.topic}
              style={{
                border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
                borderRadius: 14,
                padding: 12,
                background: theme === "light" ? "#f8faff" : "#0f1420",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: theme === "light" ? "#10131a" : "#ffffff",
                  marginBottom: 4,
                }}
              >
                {session.name}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: theme === "light" ? "#5b6578" : "#97a0b3",
                  marginBottom: 8,
                  wordBreak: "break-word",
                }}
              >
                {session.url || "No URL"}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: theme === "light" ? "#6a7488" : "#8f99ad",
                  marginBottom: 10,
                  wordBreak: "break-word",
                }}
              >
                Topic: {session.topic}
              </div>

              <button
                onClick={() => handleDisconnect(session.topic)}
                disabled={loading}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
                  background: theme === "light" ? "#ffffff" : "#1b2741",
                  color: theme === "light" ? "#10131a" : "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
