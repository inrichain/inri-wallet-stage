import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { initWalletConnect } from "../lib/walletconnect";
import { tr } from "../i18n/translations";
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
import NFTsScreen from "../screens/NFTsScreen";
import StakingScreen from "../screens/StakingScreen";
import WcSessionProposalModal from "./WcSessionProposalModal";
import WcRequestModal from "./WcRequestModal";
import {
  approveSessionProposal,
  rejectSessionProposal,
  approveSessionRequest,
  rejectSessionRequest,
} from "../lib/walletconnect";
import { wcStoreGetState, wcStoreSubscribe } from "../lib/wcSessionStore";
import { handleRequestMethod } from "../lib/wcRequestHandlers";
import {
  getMnemonicFromWallet,
  isValidSeedPhrase,
  normalizeSeed,
  shortAddress,
} from "../lib/inri";

const BASE = import.meta.env.BASE_URL || "/";
const VAULTS_KEY = "inri_wallet_vaults_v2";
const CURRENT_WALLET_KEY = "inri_wallet_current_id";
const LANG_KEY = "wallet_lang";
const THEME_KEY = "wallet_theme";

export type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "nfts"
  | "activity"
  | "swap"
  | "bridge"
  | "staking"
  | "settings";

type View = "auth" | "wallet";
type AuthMode = "unlock" | "create" | "import";

type WalletVault = {
  id: string;
  name: string;
  address: string;
  encryptedJson: string;
  createdAt: number;
};

type UnlockedWallet = {
  id: string;
  name: string;
  address: string;
  mnemonic: string;
  privateKey: string;
};

export default function WalletShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [view, setView] = useState<View>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("unlock");

  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark"
  );
  const [lang, setLang] = useState<string>(() => localStorage.getItem(LANG_KEY) || "en");

  const [wallets, setWallets] = useState<WalletVault[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");

  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [generatedSeed, setGeneratedSeed] = useState("");
  const [confirmSeedSaved, setConfirmSeedSaved] = useState(false);

  const [importName, setImportName] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importSeed, setImportSeed] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [unlockedWallet, setUnlockedWallet] = useState<UnlockedWallet | null>(null);

  const [wcProposal, setWcProposal] = useState<any | null>(null);
  const [wcRequest, setWcRequest] = useState<any | null>(null);

  const t = {
    authSubtitle: tr(lang, "auth_subtitle"),
    unlock: tr(lang, "auth_unlock"),
    create: tr(lang, "auth_create"),
    import: tr(lang, "auth_import"),
    password: tr(lang, "auth_password"),
    passwordCreate: tr(lang, "auth_password_create"),
    walletName: tr(lang, "auth_wallet_name"),
    generatedSeed: tr(lang, "auth_generated_seed"),
    generateSeed: tr(lang, "auth_generate_seed"),
    createWallet: tr(lang, "auth_create_wallet"),
    importWallet: tr(lang, "auth_import_wallet"),
    pasteSeed: tr(lang, "auth_paste_seed"),
    generateSeedFirst: tr(lang, "auth_generate_seed_first"),
    confirmSeedSaveFirst: tr(lang, "auth_confirm_seed_save_first"),
    passwordShort: tr(lang, "auth_password_short"),
    walletCreated: tr(lang, "auth_wallet_created"),
    walletImported: tr(lang, "auth_wallet_imported"),
    wrongPassword: tr(lang, "auth_wrong_password"),
    noWallet: tr(lang, "auth_no_wallet"),
    noWalletsYet: tr(lang, "auth_no_wallets_yet"),
    unlocked: tr(lang, "auth_unlocked"),
    locked: tr(lang, "auth_locked"),
    lock: tr(lang, "auth_lock"),
    invalidSeed: tr(lang, "auth_invalid_seed"),
    createFailed: tr(lang, "auth_create_failed"),
    seedGenerateError: tr(lang, "auth_seed_generate_error"),
    processing: tr(lang, "auth_processing"),
    enterPassword: tr(lang, "auth_enter_password"),
    seedBackupConfirm: tr(lang, "auth_seed_backup_confirm"),
    walletAlreadyExists: tr(lang, "auth_wallet_already_exists"),
  };

  useEffect(() => {
    const saved = localStorage.getItem(VAULTS_KEY);
    const currentId = localStorage.getItem(CURRENT_WALLET_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WalletVault[];
        setWallets(parsed);

        if (parsed.length > 0) {
          const found = parsed.find((w) => w.id === currentId)?.id || parsed[0].id || "";
          setSelectedWalletId(found);
        }
      } catch {
        setWallets([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LANG_KEY, lang);

    document.body.style.background =
      theme === "light"
        ? "linear-gradient(180deg,#eef3fb 0%, #f7f9fd 100%)"
        : "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)";

    document.body.style.color = theme === "light" ? "#10131a" : "#ffffff";
    document.body.style.margin = "0";
    document.body.style.minWidth = "320px";

    ensureFavicon();
  }, [theme, lang]);

  useEffect(() => {
    const sync = () => {
      const state = wcStoreGetState();
      setWcProposal(state.proposal);
      setWcRequest(state.request);
    };

    sync();
    return wcStoreSubscribe(sync);
  }, []);

  function ensureFavicon() {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.type = "image/png";
    link.href = `${BASE}favicon.png`;
  }

  function saveWallets(next: WalletVault[]) {
    setWallets(next);
    localStorage.setItem(VAULTS_KEY, JSON.stringify(next));
  }

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  }

  function generateSeedPhrase() {
    try {
      const wallet = ethers.Wallet.createRandom();
      const phrase = wallet.mnemonic?.phrase || "";
      setGeneratedSeed(phrase);
      setConfirmSeedSaved(false);
    } catch {
      showMessage(t.seedGenerateError);
    }
  }

  async function createWallet() {
    if (!generatedSeed.trim()) {
      showMessage(t.generateSeedFirst);
      return;
    }

    if (!confirmSeedSaved) {
      showMessage(t.confirmSeedSaveFirst);
      return;
    }

    if (!createPassword.trim() || createPassword.trim().length < 6) {
      showMessage(t.passwordShort);
      return;
    }

    setLoading(true);

    try {
      const baseWallet = ethers.Wallet.fromPhrase(generatedSeed.trim());
      const encryptedJson = await baseWallet.encrypt(createPassword.trim());

      const item: WalletVault = {
        id: "wallet_" + Date.now(),
        name: createName.trim() || `Wallet ${wallets.length + 1}`,
        address: baseWallet.address,
        encryptedJson,
        createdAt: Date.now(),
      };

      const next = [...wallets, item];
      saveWallets(next);
      setSelectedWalletId(item.id);
      localStorage.setItem(CURRENT_WALLET_KEY, item.id);

      setUnlockedWallet({
        id: item.id,
        name: item.name,
        address: baseWallet.address,
        mnemonic: generatedSeed.trim(),
        privateKey: baseWallet.privateKey,
      });

      setCreateName("");
      setCreatePassword("");
      setGeneratedSeed("");
      setConfirmSeedSaved(false);
      setView("wallet");
      setTab("dashboard");
      showMessage(t.walletCreated);
    } catch {
      showMessage(t.createFailed);
    } finally {
      setLoading(false);
    }
  }

  async function importWallet() {
    if (!importSeed.trim()) {
      showMessage(t.pasteSeed);
      return;
    }

    if (!isValidSeedPhrase(importSeed.trim())) {
      showMessage(t.invalidSeed);
      return;
    }

    if (!importPassword.trim() || importPassword.trim().length < 6) {
      showMessage(t.passwordShort);
      return;
    }

    setLoading(true);

    try {
      const normalizedSeed = normalizeSeed(importSeed.trim());
      const baseWallet = ethers.Wallet.fromPhrase(normalizedSeed);
      const encryptedJson = await baseWallet.encrypt(importPassword.trim());

      const alreadyExists = wallets.some(
        (w) => w.address.toLowerCase() === baseWallet.address.toLowerCase()
      );

      if (alreadyExists) {
        showMessage(t.walletAlreadyExists);
        setLoading(false);
        return;
      }

      const item: WalletVault = {
        id: "wallet_" + Date.now(),
        name: importName.trim() || `Wallet ${wallets.length + 1}`,
        address: baseWallet.address,
        encryptedJson,
        createdAt: Date.now(),
      };

      const next = [...wallets, item];
      saveWallets(next);
      setSelectedWalletId(item.id);
      localStorage.setItem(CURRENT_WALLET_KEY, item.id);

      setUnlockedWallet({
        id: item.id,
        name: item.name,
        address: baseWallet.address,
        mnemonic: normalizedSeed,
        privateKey: baseWallet.privateKey,
      });

      setImportName("");
      setImportPassword("");
      setImportSeed("");
      setView("wallet");
      setTab("dashboard");
      showMessage(t.walletImported);
    } catch {
      showMessage(t.invalidSeed);
    } finally {
      setLoading(false);
    }
  }

  async function unlockWallet() {
    const vault = wallets.find((w) => w.id === selectedWalletId);

    if (!vault) {
      showMessage(t.noWallet);
      return;
    }

    if (!unlockPassword.trim()) {
      showMessage(t.enterPassword);
      return;
    }

    setLoading(true);

    try {
      const decrypted = await ethers.Wallet.fromEncryptedJson(
        vault.encryptedJson,
        unlockPassword.trim()
      );

      const mnemonic = getMnemonicFromWallet(decrypted);

      setUnlockedWallet({
        id: vault.id,
        name: vault.name,
        address: decrypted.address,
        mnemonic,
        privateKey: decrypted.privateKey,
      });

      localStorage.setItem(CURRENT_WALLET_KEY, vault.id);
      setView("wallet");
      setTab("dashboard");
      setUnlockPassword("");
      showMessage(t.unlocked);
    } catch {
      showMessage(t.wrongPassword);
    } finally {
      setLoading(false);
    }
  }

  function lockWallet() {
    setUnlockedWallet(null);
    setView("auth");
    setUnlockPassword("");
    showMessage(t.locked);
  }

  const currentWalletMeta = useMemo(() => {
    if (unlockedWallet) {
      return {
        id: unlockedWallet.id,
        name: unlockedWallet.name,
        address: unlockedWallet.address,
      };
    }

    const currentId = localStorage.getItem(CURRENT_WALLET_KEY);
    return wallets.find((w) => w.id === currentId) || wallets[0] || null;
  }, [wallets, unlockedWallet]);

  const activeAddress = unlockedWallet?.address || currentWalletMeta?.address || "";

  useEffect(() => {
    if (!activeAddress) return;

    initWalletConnect(activeAddress).catch((err) => {
      console.error("WalletConnect init failed:", err);
    });
  }, [activeAddress]);

  async function onApproveProposal() {
    if (!unlockedWallet || !wcProposal) {
      showMessage("Unlock the wallet first");
      return;
    }

    try {
      await approveSessionProposal(wcProposal, unlockedWallet.address);
      showMessage("WalletConnect connected");
    } catch (err) {
      console.error(err);
      showMessage("Failed to approve connection");
    }
  }

  async function onRejectProposal() {
    if (!wcProposal) return;

    try {
      await rejectSessionProposal(wcProposal.id);
      showMessage("Connection rejected");
    } catch (err) {
      console.error(err);
      showMessage("Failed to reject connection");
    }
  }

  async function onApproveRequest() {
    if (!unlockedWallet || !wcRequest) {
      showMessage("Unlock the wallet first");
      return;
    }

    try {
      const result = await handleRequestMethod({
        method: wcRequest.method,
        params: wcRequest.params,
        address: unlockedWallet.address,
        privateKey: unlockedWallet.privateKey,
      });

      await approveSessionRequest(wcRequest, result);
      showMessage("Request approved");
    } catch (err: any) {
      console.error(err);
      showMessage(err?.message || "Failed to approve request");
    }
  }

  async function onRejectRequest() {
    if (!wcRequest) return;

    try {
      await rejectSessionRequest(wcRequest);
      showMessage("Request rejected");
    } catch (err) {
      console.error(err);
      showMessage("Failed to reject request");
    }
  }

  const renderTab = () => {
    const address = unlockedWallet?.address || currentWalletMeta?.address || "";
    const mnemonic = unlockedWallet?.mnemonic || "";

    switch (tab) {
      case "dashboard":
        return <DashboardScreen setTab={setTab} theme={theme} lang={lang} address={address} />;

      case "send":
        return <SendScreen theme={theme} lang={lang} address={address} mnemonic={mnemonic} />;

      case "receive":
        return <ReceiveScreen theme={theme} lang={lang} address={address} />;

      case "tokens":
        return <TokensScreen theme={theme} lang={lang} address={address} />;

      case "nfts":
        return <NFTsScreen theme={theme} lang={lang} address={address} />;

      case "activity":
        return <ActivityScreen theme={theme} lang={lang} address={address} />;

      case "swap":
        return <SwapScreen theme={theme} lang={lang} address={address} />;

      case "bridge":
        return <BridgeScreen theme={theme} lang={lang} address={address} />;

      case "staking":
        return <StakingScreen theme={theme} lang={lang} />;

      case "settings":
        return (
          <SettingsScreen
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
          />
        );

      default:
        return <DashboardScreen setTab={setTab} theme={theme} lang={lang} address={address} />;
    }
  };

  if (view === "auth") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            theme === "light"
              ? "linear-gradient(180deg,#eef3fb 0%, #f7f9fd 100%)"
              : "radial-gradient(circle at top, rgba(63,124,255,.12) 0%, rgba(11,11,15,1) 38%, rgba(6,7,11,1) 100%)",
          color: theme === "light" ? "#10131a" : "#ffffff",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: "min(460px, 100%)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src={BASE + "token-inri.png"}
              alt="INRI"
              style={{
                width: 154,
                height: 154,
                objectFit: "contain",
                margin: "0 auto 18px",
                display: "block",
                filter:
                  theme === "light"
                    ? "drop-shadow(0 16px 40px rgba(63,124,255,.20))"
                    : "drop-shadow(0 18px 44px rgba(63,124,255,.38))",
              }}
            />

            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: 12,
                letterSpacing: "-0.03em",
              }}
            >
              INRI Wallet
            </div>

            <div
              style={{
                color: theme === "light" ? "#5b6578" : "#97a0b3",
                fontSize: 15,
              }}
            >
              {t.authSubtitle}
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
              borderRadius: 30,
              background:
                theme === "light"
                  ? "rgba(255,255,255,.94)"
                  : "rgba(18,22,33,.92)",
              padding: 18,
              boxShadow:
                theme === "light"
                  ? "0 18px 40px rgba(20,30,60,.08)"
                  : "0 18px 40px rgba(0,0,0,.28)",
              backdropFilter: "blur(16px)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => setAuthMode("unlock")}
                style={tabButtonStyle(authMode === "unlock", theme)}
              >
                {t.unlock}
              </button>

              <button
                onClick={() => setAuthMode("create")}
                style={tabButtonStyle(authMode === "create", theme)}
              >
                {t.create}
              </button>

              <button
                onClick={() => setAuthMode("import")}
                style={tabButtonStyle(authMode === "import", theme)}
              >
                {t.import}
              </button>
            </div>

            {authMode === "unlock" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  style={inputStyle(theme)}
                >
                  {wallets.length === 0 ? (
                    <option value="">{t.noWalletsYet}</option>
                  ) : (
                    wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} — {shortAddress(wallet.address)}
                      </option>
                    ))
                  )}
                </select>

                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder={t.password}
                  style={inputStyle(theme)}
                />

                <button
                  onClick={unlockWallet}
                  style={mainButtonStyle()}
                  disabled={loading || wallets.length === 0}
                >
                  {loading ? t.processing : t.unlock}
                </button>
              </div>
            ) : null}

            {authMode === "create" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t.walletName}
                  style={inputStyle(theme)}
                />

                <textarea
                  value={generatedSeed}
                  readOnly
                  placeholder={t.generatedSeed}
                  style={textareaStyle(theme)}
                />

                <button onClick={generateSeedPhrase} style={secondaryButtonStyle(theme)}>
                  {t.generateSeed}
                </button>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontSize: 13,
                    color: theme === "light" ? "#42506a" : "#a7b0c4",
                    lineHeight: 1.45,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmSeedSaved}
                    onChange={(e) => setConfirmSeedSaved(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>{t.seedBackupConfirm}</span>
                </label>

                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder={t.passwordCreate}
                  style={inputStyle(theme)}
                />

                <button
                  onClick={createWallet}
                  style={mainButtonStyle()}
                  disabled={loading}
                >
                  {loading ? t.processing : t.createWallet}
                </button>
              </div>
            ) : null}

            {authMode === "import" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder={t.walletName}
                  style={inputStyle(theme)}
                />

                <textarea
                  value={importSeed}
                  onChange={(e) => setImportSeed(e.target.value)}
                  placeholder={t.pasteSeed}
                  style={textareaStyle(theme)}
                />

                <input
                  type="password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  placeholder={t.passwordCreate}
                  style={inputStyle(theme)}
                />

                <button
                  onClick={importWallet}
                  style={mainButtonStyle()}
                  disabled={loading}
                >
                  {loading ? t.processing : t.importWallet}
                </button>
              </div>
            ) : null}

            {message ? (
              <div
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  color: "#3f7cff",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: "132px",
        background:
          theme === "light"
            ? "linear-gradient(180deg,#eef3fb 0%, #f7f9fd 100%)"
            : "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)",
        boxSizing: "border-box",
      }}
    >
      <Header
        walletName={currentWalletMeta?.name || "INRI Wallet"}
        theme={theme}
        lang={lang}
      />

      <main
        style={{
          padding: "16px",
          maxWidth: 980,
          margin: "0 auto",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={lockWallet} style={secondaryButtonStyle(theme)}>
            {t.lock}
          </button>
        </div>

        {renderTab()}
      </main>

      <BottomNav tab={tab} setTab={setTab} theme={theme} lang={lang} />

      <WcSessionProposalModal
        open={!!wcProposal}
        theme={theme}
        proposal={wcProposal}
        onApprove={onApproveProposal}
        onReject={onRejectProposal}
      />

      <WcRequestModal
        open={!!wcRequest}
        theme={theme}
        request={wcRequest}
        onApprove={onApproveRequest}
        onReject={onRejectRequest}
      />
    </div>
  );
}

function tabButtonStyle(
  active: boolean,
  theme: "dark" | "light"
): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: active
      ? "1px solid #4d7ef2"
      : `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
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

function mainButtonStyle(): React.CSSProperties {
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
