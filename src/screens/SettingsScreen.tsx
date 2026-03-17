import React, { useEffect, useRef, useState } from "react";
import {
  DEFAULT_NETWORKS,
  getStoredNetwork,
  saveStoredNetwork,
  type NetworkItem,
} from "../lib/network";
import { tr } from "../i18n/translations";
import {
  pairWalletConnect,
  getActiveSessions,
  disconnectSession,
  disconnectAllSessions,
} from "../lib/walletconnect";
import WalletConnectQrScanner from "../components/WalletConnectQrScanner";

const AVATAR_KEY = "wallet_avatar";

export default function SettingsScreen({
  theme = "dark",
  setTheme,
  lang = "en",
  setLang,
}: {
  theme?: "dark" | "light";
  setTheme: (value: "dark" | "light") => void;
  lang?: string;
  setLang: (value: string) => void;
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [customRpc, setCustomRpc] = useState(getStoredNetwork().rpcUrl || "");
  const [avatar, setAvatar] = useState<string>(localStorage.getItem(AVATAR_KEY) || "");
  const [wcUri, setWcUri] = useState("");
  const [wcSessions, setWcSessions] = useState<any[]>([]);
  const [wcLoading, setWcLoading] = useState(false);
  const [wcMessage, setWcMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const t = {
    settings: tr(lang, "settings"),
    subtitle: tr(lang, "settings_subtitle"),
    language: tr(lang, "settings_language"),
    theme: tr(lang, "settings_theme"),
    dark: tr(lang, "settings_dark"),
    light: tr(lang, "settings_light"),
    network: tr(lang, "settings_network"),
    networkHint: tr(lang, "settings_network_hint"),
    saveRpc: tr(lang, "settings_save_rpc"),
    active: tr(lang, "settings_active"),
    select: tr(lang, "settings_select"),
    avatar: tr(lang, "settings_avatar"),
    uploadAvatar: tr(lang, "settings_upload_avatar"),
    removeAvatar: tr(lang, "settings_remove_avatar"),
    avatarHint: tr(lang, "settings_avatar_hint"),
  };

  useEffect(() => {
    setNetwork(getStoredNetwork());
    setCustomRpc(getStoredNetwork().rpcUrl || "");
    refreshSessions();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshSessions();
    }, 2000);

    return () => window.clearInterval(id);
  }, []);

  function showWcMessage(text: string) {
    setWcMessage(text);
    window.setTimeout(() => setWcMessage(""), 2800);
  }

  function refreshSessions() {
    try {
      const list = getActiveSessions();
      setWcSessions(Array.isArray(list) ? list : []);
    } catch {
      setWcSessions([]);
    }
  }

  function handleSelectNetwork(item: NetworkItem) {
    saveStoredNetwork(item);
    setNetwork(item);
    setCustomRpc(item.rpcUrl || "");
    window.dispatchEvent(new Event("wallet-network-updated"));
    showWcMessage(`Network changed to ${item.name} (${item.chainId})`);
  }

  function handleSaveRpc() {
    const next = {
      ...network,
      rpcUrl: customRpc.trim() || network.rpcUrl,
    };

    saveStoredNetwork(next);
    setNetwork(next);
    window.dispatchEvent(new Event("wallet-network-updated"));
    showWcMessage("RPC saved");
  }

  function handleUploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      localStorage.setItem(AVATAR_KEY, result);
      setAvatar(result);
      window.dispatchEvent(new Event("wallet-avatar-updated"));
    };

    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    localStorage.removeItem(AVATAR_KEY);
    setAvatar("");
    window.dispatchEvent(new Event("wallet-avatar-updated"));
  }

  async function handleConnectWc() {
    if (!wcUri.trim()) {
      showWcMessage("Paste a WalletConnect URI");
      return;
    }

    const current = getStoredNetwork();
    if (Number(current?.chainId) !== 3777) {
      showWcMessage("Select INRI network (3777) before connecting.");
      return;
    }

    setWcLoading(true);

    try {
      await pairWalletConnect(wcUri.trim());
      setWcUri("");
      refreshSessions();
      showWcMessage("WalletConnect pairing started");
    } catch (err: any) {
      console.error(err);
      showWcMessage(err?.message || "Failed to connect WalletConnect");
    } finally {
      setWcLoading(false);
    }
  }

  async function handleDisconnectSession(topic: string) {
    setWcLoading(true);

    try {
      await disconnectSession(topic);
      refreshSessions();
      showWcMessage("Session disconnected");
    } catch (err: any) {
      console.error(err);
      showWcMessage(err?.message || "Failed to disconnect session");
    } finally {
      setWcLoading(false);
    }
  }

  async function handleDisconnectAll() {
    setWcLoading(true);

    try {
      await disconnectAllSessions();
      refreshSessions();
      showWcMessage("All sessions disconnected");
    } catch (err: any) {
      console.error(err);
      showWcMessage(err?.message || "Failed to disconnect all sessions");
    } finally {
      setWcLoading(false);
    }
  }

  function handleScannedUri(value: string) {
    setScannerOpen(false);
    setWcUri(value);
    showWcMessage("WalletConnect QR detected");
  }

  return (
    <>
      <div style={{ display: "grid", gap: 18 }}>
        <div style={cardStyle(isLight)}>
          <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>
            {t.settings}
          </h2>
          <div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3" }}>
            {t.subtitle}
          </div>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.language}</div>

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={inputStyle(isLight)}
          >
            <option value="en">English</option>
            <option value="pt">Português</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="tr">Türkçe</option>
          </select>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.theme}</div>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "dark" | "light")}
            style={inputStyle(isLight)}
          >
            <option value="dark">{t.dark}</option>
            <option value="light">{t.light}</option>
          </select>
        </div>

        <div style={cardStyle(isLight)}>
          <div
            style={{
              fontWeight: 800,
              color: isLight ? "#10131a" : "#ffffff",
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            {t.network}
          </div>

          <div
            style={{
              color: isLight ? "#5b6578" : "#97a0b3",
              marginBottom: 16,
              lineHeight: 1.55,
            }}
          >
            {t.networkHint}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {DEFAULT_NETWORKS.map((item) => {
              const active = item.key === network.key;

              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectNetwork(item)}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 18,
                    border: active
                      ? "1px solid #4d7ef2"
                      : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                    background: active
                      ? isLight
                        ? "#eef4ff"
                        : "#16213b"
                      : isLight
                      ? "#ffffff"
                      : "#121621",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={item.logo}
                      alt={item.name}
                      style={{ width: 28, height: 28, borderRadius: 14, objectFit: "contain" }}
                    />

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: isLight ? "#10131a" : "#ffffff",
                          fontSize: 17,
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={{
                          color: isLight ? "#5b6578" : "#97a0b3",
                          fontSize: 13,
                          marginTop: 3,
                        }}
                      >
                        Chain ID {item.chainId} • {item.symbol}
                      </div>
                    </div>

                    <div
                      style={{
                        color: active ? "#3f7cff" : isLight ? "#64748b" : "#94a3b8",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {active ? t.active : t.select}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <input
            value={customRpc}
            onChange={(e) => setCustomRpc(e.target.value)}
            placeholder="https://rpc.inri.life"
            style={{ ...inputStyle(isLight), marginTop: 14 }}
          />

          <div style={{ marginTop: 14 }}>
            <button onClick={handleSaveRpc} style={mainButtonStyle()}>
              {t.saveRpc}
            </button>
          </div>
        </div>

        <div style={cardStyle(isLight)}>
          <div
            style={{
              fontWeight: 800,
              color: isLight ? "#10131a" : "#ffffff",
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            WalletConnect
          </div>

          <div
            style={{
              color: isLight ? "#5b6578" : "#97a0b3",
              marginBottom: 14,
              lineHeight: 1.55,
            }}
          >
            Select the INRI network first, then scan a WalletConnect QR code or paste a
            <strong> wc:</strong> URI.
          </div>

          <textarea
            value={wcUri}
            onChange={(e) => setWcUri(e.target.value)}
            placeholder="wc:..."
            style={{
              ...inputStyle(isLight),
              minHeight: 96,
              resize: "vertical",
              marginBottom: 12,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <button
              onClick={handleConnectWc}
              disabled={wcLoading}
              style={mainButtonStyle()}
            >
              {wcLoading ? "Connecting..." : "Connect URI"}
            </button>

            <button
              onClick={() => setScannerOpen(true)}
              disabled={wcLoading}
              style={secondaryButtonStyle(isLight)}
            >
              Scan QR Code
            </button>

            <button
              onClick={refreshSessions}
              disabled={wcLoading}
              style={secondaryButtonStyle(isLight)}
            >
              Refresh
            </button>

            <button
              onClick={handleDisconnectAll}
              disabled={wcLoading || wcSessions.length === 0}
              style={secondaryButtonStyle(isLight)}
            >
              Disconnect All
            </button>
          </div>

          {wcMessage ? (
            <div
              style={{
                marginBottom: 14,
                color: "#3f7cff",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {wcMessage}
            </div>
          ) : null}

          <div
            style={{
              fontWeight: 800,
              color: isLight ? "#10131a" : "#ffffff",
              fontSize: 15,
              marginBottom: 10,
            }}
          >
            Active Sessions
          </div>

          {wcSessions.length === 0 ? (
            <div
              style={{
                color: isLight ? "#5b6578" : "#97a0b3",
                fontSize: 13,
              }}
            >
              No active WalletConnect sessions.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {wcSessions.map((session) => (
                <div
                  key={session.topic}
                  style={{
                    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                    borderRadius: 14,
                    padding: 12,
                    background: isLight ? "#f8faff" : "#0f1420",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: isLight ? "#10131a" : "#ffffff",
                      marginBottom: 4,
                    }}
                  >
                    {session.name}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: isLight ? "#5b6578" : "#97a0b3",
                      marginBottom: 8,
                      wordBreak: "break-word",
                    }}
                  >
                    {session.url || "No URL"}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: isLight ? "#6a7488" : "#8f99ad",
                      marginBottom: 10,
                      wordBreak: "break-word",
                    }}
                  >
                    Topic: {session.topic}
                  </div>

                  <button
                    onClick={() => handleDisconnectSession(session.topic)}
                    disabled={wcLoading}
                    style={secondaryButtonStyle(isLight)}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle(isLight)}>
          <div
            style={{
              fontWeight: 800,
              color: isLight ? "#10131a" : "#ffffff",
              fontSize: 18,
              marginBottom: 14,
            }}
          >
            {t.avatar}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}`,
                background: isLight ? "#f8fafc" : "#0b1120",
                display: "grid",
                placeItems: "center",
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: isLight ? "#cbd5e1" : "#334155",
                  }}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => fileRef.current?.click()} style={mainButtonStyle()}>
                {t.uploadAvatar}
              </button>

              <button onClick={handleRemoveAvatar} style={secondaryButtonStyle(isLight)}>
                {t.removeAvatar}
              </button>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUploadAvatar}
            style={{ display: "none" }}
          />

          <div
            style={{
              marginTop: 14,
              color: isLight ? "#5b6578" : "#97a0b3",
              lineHeight: 1.55,
            }}
          >
            {t.avatarHint}
          </div>
        </div>
      </div>

      <WalletConnectQrScanner
        open={scannerOpen}
        theme={theme}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedUri}
      />
    </>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}

function labelStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
    marginBottom: 10,
  };
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#0d111b",
    color: isLight ? "#10131a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function mainButtonStyle(): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#1b2741",
    color: isLight ? "#10131a" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}
