import React, { useEffect, useState } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import DashboardScreen from "../screens/DashboardScreen";
import SendScreen from "../screens/SendScreen";
import ReceiveScreen from "../screens/ReceiveScreen";
import TokensScreen from "../screens/TokensScreen";
import ActivityScreen from "../screens/ActivityScreen";
import SwapScreen from "../screens/SwapScreen";
import BridgeScreen from "../screens/BridgeScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "activity"
  | "swap"
  | "bridge"
  | "settings";

type View = "auth" | "wallet";

const VAULT_KEY = "wallet_seed_phrase";
const PASSWORD_KEY = "wallet_password_demo";

export default function WalletShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [view, setView] = useState<View>("auth");

  const [createSeed, setCreateSeed] = useState("");
  const [importSeed, setImportSeed] = useState("");
  const [password, setPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedSeed = localStorage.getItem(VAULT_KEY);
    const savedPassword = localStorage.getItem(PASSWORD_KEY);

    if (savedSeed && savedPassword) {
      setView("auth");
    } else {
      setView("auth");
    }
  }, []);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function generateSeed() {
    const words = [
      "inri", "chain", "wallet", "bridge", "token", "secure",
      "future", "stable", "polygon", "validator", "swap", "network"
    ];
    setCreateSeed(words.join(" "));
  }

  function createWallet() {
    if (!createSeed) {
      showMessage("Generate seed first.");
      return;
    }

    if (password.length < 4) {
      showMessage("Password must be at least 4 chars.");
      return;
    }

    localStorage.setItem(VAULT_KEY, createSeed);
    localStorage.setItem(PASSWORD_KEY, password);
    showMessage("Wallet created.");
    setView("wallet");
  }

  function importWallet() {
    if (!importSeed.trim()) {
      showMessage("Paste seed phrase.");
      return;
    }

    if (password.length < 4) {
      showMessage("Password must be at least 4 chars.");
      return;
    }

    localStorage.setItem(VAULT_KEY, importSeed.trim());
    localStorage.setItem(PASSWORD_KEY, password);
    showMessage("Wallet imported.");
    setView("wallet");
  }

  function unlockWallet() {
    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (!savedPassword) {
      showMessage("No wallet found.");
      return;
    }

    if (unlockPassword !== savedPassword) {
      showMessage("Wrong password.");
      return;
    }

    setView("wallet");
    showMessage("Unlocked.");
  }

  function logout() {
    setView("auth");
    setUnlockPassword("");
  }

  const renderTab = () => {
    switch (tab) {
      case "dashboard":
        return <DashboardScreen setTab={setTab} />;
      case "send":
        return <SendScreen />;
      case "receive":
        return <ReceiveScreen />;
      case "tokens":
        return <TokensScreen />;
      case "activity":
        return <ActivityScreen />;
      case "swap":
        return <SwapScreen />;
      case "bridge":
        return <BridgeScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <DashboardScreen setTab={setTab} />;
    }
  };

  const hasWallet = !!localStorage.getItem(VAULT_KEY);

  if (view === "auth") {
    return (
      <div style={{ minHeight: "100vh", padding: 20, background: "#0b0b0f", color: "#fff" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "grid", gap: 16 }}>
          <div
            style={{
              border: "1px solid #252b39",
              borderRadius: 20,
              background: "#121621",
              padding: 18,
            }}
          >
            <h1 style={{ marginTop: 0 }}>INRI Wallet</h1>
            <div style={{ color: "#97a0b3" }}>Create, import or unlock your wallet</div>
          </div>

          {hasWallet ? (
            <div
              style={{
                border: "1px solid #252b39",
                borderRadius: 20,
                background: "#121621",
                padding: 18,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Unlock Wallet</h2>
              <input
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Password"
                type="password"
                style={inputStyle}
              />
              <button onClick={unlockWallet} style={mainButtonStyle}>
                Unlock
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  border: "1px solid #252b39",
                  borderRadius: 20,
                  background: "#121621",
                  padding: 18,
                }}
              >
                <h2 style={{ marginTop: 0 }}>Create Wallet</h2>

                <textarea
                  value={createSeed}
                  readOnly
                  placeholder="Generated seed phrase will appear here"
                  style={textareaStyle}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button onClick={generateSeed} style={secondaryButtonStyle}>
                    Generate Seed
                  </button>
                </div>

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  style={{ ...inputStyle, marginTop: 12 }}
                />

                <button onClick={createWallet} style={mainButtonStyle}>
                  Create Wallet
                </button>
              </div>

              <div
                style={{
                  border: "1px solid #252b39",
                  borderRadius: 20,
                  background: "#121621",
                  padding: 18,
                }}
              >
                <h2 style={{ marginTop: 0 }}>Import Wallet</h2>

                <textarea
                  value={importSeed}
                  onChange={(e) => setImportSeed(e.target.value)}
                  placeholder="Paste seed phrase"
                  style={textareaStyle}
                />

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  style={{ ...inputStyle, marginTop: 12 }}
                />

                <button onClick={importWallet} style={mainButtonStyle}>
                  Import Wallet
                </button>
              </div>
            </>
          )}

          {message ? <div style={{ color: "#8fb3ff" }}>{message}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 88 }}>
      <Header />
      <main style={{ padding: "16px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={logout} style={secondaryButtonStyle}>
            Lock
          </button>
        </div>
        {renderTab()}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#0d111b",
  color: "#fff",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#0d111b",
  color: "#fff",
  outline: "none",
  resize: "vertical",
};

const mainButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "none",
  background: "#3f7cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 16,
  marginTop: 12,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#1b2741",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};
