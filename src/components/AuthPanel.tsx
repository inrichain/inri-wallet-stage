import React from "react";
import { shortAddress } from "../lib/inri";

export type AuthMode = "unlock" | "create" | "import";

export type AuthTexts = {
  authSubtitle: string;
  unlock: string;
  create: string;
  import: string;
  password: string;
  passwordCreate: string;
  walletName: string;
  generatedSeed: string;
  generateSeed: string;
  createWallet: string;
  importWallet: string;
  pasteSeed: string;
  noWalletsYet: string;
  processing: string;
  seedBackupConfirm: string;
};

type WalletOption = {
  id: string;
  name: string;
  address: string;
};

export default function AuthPanel({
  theme,
  baseUrl,
  mode,
  setMode,
  texts,
  wallets,
  selectedWalletId,
  setSelectedWalletId,
  unlockPassword,
  setUnlockPassword,
  createName,
  setCreateName,
  createPassword,
  setCreatePassword,
  generatedSeed,
  confirmSeedSaved,
  setConfirmSeedSaved,
  importName,
  setImportName,
  importPassword,
  setImportPassword,
  importSeed,
  setImportSeed,
  loading,
  message,
  onGenerateSeed,
  onUnlock,
  onCreate,
  onImport,
}: {
  theme: "dark" | "light";
  baseUrl: string;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  texts: AuthTexts;
  wallets: WalletOption[];
  selectedWalletId: string;
  setSelectedWalletId: (value: string) => void;
  unlockPassword: string;
  setUnlockPassword: (value: string) => void;
  createName: string;
  setCreateName: (value: string) => void;
  createPassword: string;
  setCreatePassword: (value: string) => void;
  generatedSeed: string;
  confirmSeedSaved: boolean;
  setConfirmSeedSaved: (value: boolean) => void;
  importName: string;
  setImportName: (value: string) => void;
  importPassword: string;
  setImportPassword: (value: string) => void;
  importSeed: string;
  setImportSeed: (value: string) => void;
  loading: boolean;
  message: string;
  onGenerateSeed: () => void;
  onUnlock: () => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  const isLight = theme === "light";

  return (
    <div className="wallet-auth-shell" style={{ color: isLight ? "#10131a" : "#ffffff" }}>
      <div className="wallet-auth-wrap wallet-auth-layout">
        <div className="wallet-auth-hero">
          <img
            src={baseUrl + "token-inri.png"}
            alt="INRI"
            className="wallet-auth-logo"
            style={{
              filter: isLight
                ? "drop-shadow(0 16px 40px rgba(63,124,255,.20))"
                : "drop-shadow(0 18px 44px rgba(63,124,255,.38))",
            }}
          />

          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, marginBottom: 12, letterSpacing: "-0.03em" }}>
            INRI Wallet
          </div>

          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 15, maxWidth: 420, margin: "0 auto" }}>{texts.authSubtitle}</div>
        </div>

        <div className="wallet-surface wallet-auth-card" style={{ background: isLight ? "rgba(255,255,255,.94)" : "rgba(18,22,33,.92)" }}>
          <div className="wallet-auth-tabs">
            <button onClick={() => setMode("unlock")} style={tabButtonStyle(mode === "unlock", theme)}>{texts.unlock}</button>
            <button onClick={() => setMode("create")} style={tabButtonStyle(mode === "create", theme)}>{texts.create}</button>
            <button onClick={() => setMode("import")} style={tabButtonStyle(mode === "import", theme)}>{texts.import}</button>
          </div>

          {mode === "unlock" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <select value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} style={inputStyle(theme)}>
                {wallets.length === 0 ? (
                  <option value="">{texts.noWalletsYet}</option>
                ) : (
                  wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} — {shortAddress(wallet.address)}
                    </option>
                  ))
                )}
              </select>

              <input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} placeholder={texts.password} style={inputStyle(theme)} />

              <button onClick={onUnlock} style={primaryButtonStyle()} disabled={loading || wallets.length === 0}>
                {loading ? texts.processing : texts.unlock}
              </button>
            </div>
          ) : null}

          {mode === "create" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={texts.walletName} style={inputStyle(theme)} />
              <textarea value={generatedSeed} readOnly placeholder={texts.generatedSeed} style={textareaStyle(theme)} />
              <button onClick={onGenerateSeed} style={secondaryButtonStyle(theme)}>{texts.generateSeed}</button>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: isLight ? "#42506a" : "#a7b0c4", lineHeight: 1.45 }}>
                <input type="checkbox" checked={confirmSeedSaved} onChange={(e) => setConfirmSeedSaved(e.target.checked)} style={{ marginTop: 2 }} />
                <span>{texts.seedBackupConfirm}</span>
              </label>

              <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder={texts.passwordCreate} style={inputStyle(theme)} />
              <button onClick={onCreate} style={primaryButtonStyle()} disabled={loading}>{loading ? texts.processing : texts.createWallet}</button>
            </div>
          ) : null}

          {mode === "import" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <input value={importName} onChange={(e) => setImportName(e.target.value)} placeholder={texts.walletName} style={inputStyle(theme)} />
              <textarea value={importSeed} onChange={(e) => setImportSeed(e.target.value)} placeholder={texts.pasteSeed} style={textareaStyle(theme)} />
              <input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} placeholder={texts.passwordCreate} style={inputStyle(theme)} />
              <button onClick={onImport} style={primaryButtonStyle()} disabled={loading}>{loading ? texts.processing : texts.importWallet}</button>
            </div>
          ) : null}

          {message ? <div className="wallet-inline-feedback">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

function tabButtonStyle(active: boolean, theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: active ? "1px solid #4d7ef2" : `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: active ? "#3f7cff" : theme === "light" ? "#f3f6fc" : "#141927",
    color: active ? "#fff" : theme === "light" ? "#10131a" : "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
  };
}

function inputStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    padding: 13,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "#f6f8fc" : "#0d111b",
    color: theme === "light" ? "#10131a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textareaStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 110,
    padding: 13,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "#f6f8fc" : "#0d111b",
    color: theme === "light" ? "#10131a" : "#ffffff",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16,
  };
}

function secondaryButtonStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "#ffffff" : "#1b2741",
    color: theme === "light" ? "#10131a" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}
