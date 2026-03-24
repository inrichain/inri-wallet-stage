import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { initWalletConnect } from "../lib/walletconnect";
import { tr, trf } from "../i18n/translations";
import Header from "./Header";
import BottomNav from "./BottomNav";
import AuthPanel, { type AuthMode } from "./AuthPanel";
import ReauthModal from "./ReauthModal";
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
import MoreScreen from "../screens/MoreScreen";
import NetworksScreen from "../screens/NetworksScreen";
import WalletConnectScreen from "../screens/WalletConnectScreen";
import AssetManagerScreen from "../screens/AssetManagerScreen";
import P2PScreen from "../screens/P2PScreen";
import PoolScreen from "../screens/PoolScreen";
import ToastViewport from "./ToastViewport";
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
import { isValidSeedPhrase, normalizeSeed } from "../lib/inri";
import { getSecuritySettings, type SecuritySettings } from "../lib/security";
import { installDesktopEthereumProvider } from "../lib/desktopProvider";
import { getInriNetwork, getStoredNetwork, saveStoredNetwork } from "../lib/network";
import type { AppToastPayload, AppToastType } from "../lib/ui";
import type { Tab } from "../lib/navigation";

const BASE = import.meta.env.BASE_URL || "/";
const VAULTS_KEY = "inri_wallet_vaults_v2";
const CURRENT_WALLET_KEY = "inri_wallet_current_id";
const LANG_KEY = "wallet_lang";
const THEME_KEY = "wallet_theme";

type View = "auth" | "wallet";

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
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: AppToastType }>>([]);

  const [unlockedWallet, setUnlockedWallet] = useState<UnlockedWallet | null>(null);
  const [security, setSecurity] = useState<SecuritySettings>(() => getSecuritySettings());
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");

  const autoLockTimerRef = useRef<number | null>(null);
  const pendingSensitiveActionRef = useRef<null | ((overridePrivateKey?: string) => Promise<void>)>(null);

  const [wcProposal, setWcProposal] = useState<any | null>(null);
  const [wcRequest, setWcRequest] = useState<any | null>(null);
  const [wcApproving, setWcApproving] = useState(false);

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
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppToastPayload>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const duration = Math.max(1200, Math.min(detail.durationMs || 2600, 6000));
      setToasts((prev) => [...prev, { id, message: detail.message, type: detail.type || "info" }]);
      window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), duration);
    };
    window.addEventListener("app-toast", handler as EventListener);
    return () => window.removeEventListener("app-toast", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("wallet_active_network")) {
      saveStoredNetwork(getInriNetwork());
      window.dispatchEvent(new Event("wallet-network-updated"));
    }
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
    const syncSecurity = () => setSecurity(getSecuritySettings());
    syncSecurity();
    window.addEventListener("wallet-security-updated", syncSecurity);
    return () => window.removeEventListener("wallet-security-updated", syncSecurity);
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

      setUnlockedWallet({
        id: vault.id,
        name: vault.name,
        address: decrypted.address,
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

  const lockWallet = useCallback((reason?: string) => {
    pendingSensitiveActionRef.current = null;
    setReauthOpen(false);
    setReauthPassword("");
    setReauthError("");
    setUnlockedWallet((current) => {
      if (!current) return null;
      return null;
    });
    setView("auth");
    setUnlockPassword("");
    showMessage(reason || t.locked);
  }, [t.locked]);

  const markActivity = useCallback(() => {
    if (!unlockedWallet || !security.autoLockEnabled) return;
    if (autoLockTimerRef.current) {
      window.clearTimeout(autoLockTimerRef.current);
    }

    autoLockTimerRef.current = window.setTimeout(() => {
      lockWallet(trf(lang, "security_locked_inactivity", { minutes: security.autoLockMinutes }));
    }, security.autoLockMinutes * 60 * 1000);
  }, [lockWallet, security.autoLockEnabled, security.autoLockMinutes, unlockedWallet]);

  useEffect(() => {
    if (!unlockedWallet || !security.autoLockEnabled) {
      if (autoLockTimerRef.current) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
      return;
    }

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "focus", "mousemove"];
    let throttle = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - throttle < 1500) return;
      throttle = now;
      markActivity();
    };

    const handleVisibility = () => {
      if (document.hidden && security.lockOnHidden) {
        lockWallet(tr(lang, "security_locked_background"));
        return;
      }

      if (!document.hidden) markActivity();
    };

    markActivity();
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      if (autoLockTimerRef.current) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    };
  }, [lockWallet, markActivity, security.autoLockEnabled, security.lockOnHidden, unlockedWallet]);

  async function runSensitiveAction(action: (overridePrivateKey?: string) => Promise<void>) {
    if (!security.requirePasswordForSensitiveActions) {
      await action();
      markActivity();
      return;
    }

    pendingSensitiveActionRef.current = action;
    setReauthPassword("");
    setReauthError("");
    setReauthOpen(true);
  }

  async function confirmSensitiveAction() {
    const vault = wallets.find((w) => w.id === (unlockedWallet?.id || selectedWalletId));

    if (!vault) {
      setReauthError(tr(lang, "security_vault_not_found"));
      return;
    }

    if (!reauthPassword.trim()) {
      setReauthError(tr(lang, "security_enter_password"));
      return;
    }

    try {
      const decrypted = await ethers.Wallet.fromEncryptedJson(vault.encryptedJson, reauthPassword.trim());
      setUnlockedWallet((current) =>
        current
          ? {
              ...current,
              address: decrypted.address,
              privateKey: decrypted.privateKey,
            }
          : current
      );

      const action = pendingSensitiveActionRef.current;
      pendingSensitiveActionRef.current = null;
      setReauthOpen(false);
      setReauthPassword("");
      setReauthError("");

      if (action) {
        await action(decrypted.privateKey);
        markActivity();
      }
    } catch {
      setReauthError(tr(lang, "security_wrong_password"));
    }
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

    initWalletConnect(activeAddress, Number(getStoredNetwork().chainId || 3777)).catch((err) => {
      console.error("WalletConnect init failed:", err);
    });
  }, [activeAddress]);

  useEffect(() => {
    if (!unlockedWallet) return;

    const cleanup = installDesktopEthereumProvider({
      getAddress: () => unlockedWallet.address,
      getPrivateKey: () => unlockedWallet.privateKey,
      requireSensitiveApproval: async (args) => {
        return await new Promise((resolve, reject) => {
          runSensitiveAction(async (overridePrivateKey?: string) => {
            try {
              const result = await handleRequestMethod({
                ...args,
                privateKey: overridePrivateKey || unlockedWallet.privateKey,
                chainId: `eip155:${Number(getStoredNetwork().chainId || 3777)}`,
              });
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }).catch(reject);
        });
      },
      showMessage,
    });

    return cleanup;
  }, [unlockedWallet, security, lang]);

  async function onApproveProposal() {
    if (!unlockedWallet || !wcProposal) {
      showMessage(tr(lang, "shell_unlock_first"));
      return;
    }

    try {
      await approveSessionProposal(wcProposal, unlockedWallet.address);
      showMessage(tr(lang, "shell_wc_connected"));
    } catch (err) {
      console.error(err);
      showMessage(tr(lang, "shell_wc_approve_failed"));
    }
  }

  async function onRejectProposal() {
    if (!wcProposal) return;

    try {
      await rejectSessionProposal(wcProposal.id);
      showMessage(tr(lang, "shell_connection_rejected"));
    } catch (err) {
      console.error(err);
      showMessage(tr(lang, "shell_reject_failed"));
    }
  }

  async function onApproveRequest() {
    if (!unlockedWallet || !wcRequest) {
      showMessage(tr(lang, "shell_unlock_first"));
      return;
    }

    if (wcApproving) return;
    setWcApproving(true);

    try {
      await runSensitiveAction(async (overridePrivateKey?: string) => {
        try {
          const result = await handleRequestMethod({
            method: wcRequest.method,
            params: wcRequest.params,
            address: unlockedWallet.address,
            privateKey: overridePrivateKey || unlockedWallet.privateKey,
            chainId: wcRequest.chainId,
          });

          await approveSessionRequest(wcRequest, result);
          showMessage(tr(lang, "shell_request_approved"));
        } catch (err: any) {
          console.error(err);
          showMessage(err?.message || tr(lang, "shell_request_approve_failed"));
        } finally {
          setWcApproving(false);
        }
      });
    } catch {
      setWcApproving(false);
    }
  }

  async function onRejectRequest() {
    if (!wcRequest || wcApproving) return;

    try {
      await rejectSessionRequest(wcRequest);
      showMessage(tr(lang, "shell_request_rejected"));
    } catch (err) {
      console.error(err);
      showMessage(tr(lang, "shell_request_reject_failed"));
    }
  }

  const renderTab = () => {
    const address = unlockedWallet?.address || currentWalletMeta?.address || "";
    const privateKey = unlockedWallet?.privateKey || "";

    switch (tab) {
      case "dashboard":
        return <DashboardScreen setTab={setTab} theme={theme} lang={lang} address={address} />;

      case "send":
        return <SendScreen theme={theme} lang={lang} address={address} privateKey={privateKey} />;

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
        return <BridgeScreen theme={theme} lang={lang} address={address} privateKey={privateKey} />;

      case "staking":
        return <StakingScreen theme={theme} lang={lang} />;

      case "more":
        return <MoreScreen theme={theme} lang={lang} setTab={setTab as any} />;

      case "networks":
        return <NetworksScreen theme={theme} lang={lang} />;

      case "walletconnect":
        return <WalletConnectScreen theme={theme} lang={lang} />;

      case "assets":
        return <AssetManagerScreen theme={theme} lang={lang} />;

      case "p2p":
        return <P2PScreen theme={theme} lang={lang} setTab={setTab as any} address={address} privateKey={privateKey} />;

      case "pool":
        return <PoolScreen theme={theme} lang={lang} address={address} />;

      case "settings":
        return (
          <SettingsScreen
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
            security={security}
          />
        );

      default:
        return <DashboardScreen setTab={setTab} theme={theme} lang={lang} address={address} />;
    }
  };

  if (view === "auth") {
    return (
      <AuthPanel
        theme={theme}
        baseUrl={BASE}
        mode={authMode}
        setMode={setAuthMode}
        texts={{
          authSubtitle: t.authSubtitle,
          unlock: t.unlock,
          create: t.create,
          import: t.import,
          password: t.password,
          passwordCreate: t.passwordCreate,
          walletName: t.walletName,
          generatedSeed: t.generatedSeed,
          generateSeed: t.generateSeed,
          createWallet: t.createWallet,
          importWallet: t.importWallet,
          pasteSeed: t.pasteSeed,
          noWalletsYet: t.noWalletsYet,
          processing: t.processing,
          seedBackupConfirm: t.seedBackupConfirm,
        }}
        wallets={wallets}
        selectedWalletId={selectedWalletId}
        setSelectedWalletId={setSelectedWalletId}
        unlockPassword={unlockPassword}
        setUnlockPassword={setUnlockPassword}
        createName={createName}
        setCreateName={setCreateName}
        createPassword={createPassword}
        setCreatePassword={setCreatePassword}
        generatedSeed={generatedSeed}
        confirmSeedSaved={confirmSeedSaved}
        setConfirmSeedSaved={setConfirmSeedSaved}
        importName={importName}
        setImportName={setImportName}
        importPassword={importPassword}
        setImportPassword={setImportPassword}
        importSeed={importSeed}
        setImportSeed={setImportSeed}
        loading={loading}
        message={message}
        onGenerateSeed={generateSeedPhrase}
        onUnlock={unlockWallet}
        onCreate={createWallet}
        onImport={importWallet}
      />
    );
  }

  return (
    <div
      className="wallet-page-shell"
      style={{
        background:
          theme === "light"
            ? "linear-gradient(180deg,#eef3fb 0%, #f7f9fd 100%)"
            : "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)",
      }}
    >
      <Header
          onOpenSettings={() => setTab("settings")}
        walletName={currentWalletMeta?.name || "INRI Wallet"}
        theme={theme}
        lang={lang}
      />

      <main className="wallet-main-shell">
        <div className="wallet-top-actions">
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
        lang={lang}
        proposal={wcProposal}
        onApprove={onApproveProposal}
        onReject={onRejectProposal}
      />

      <WcRequestModal
        open={!!wcRequest}
        theme={theme}
        lang={lang}
        request={wcRequest}
        approving={wcApproving}
        onApprove={onApproveRequest}
        onReject={onRejectRequest}
      />

      <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))} />

      <ReauthModal
        open={reauthOpen}
        theme={theme}
        title={tr(lang, "security_confirm_title")}
        hint={tr(lang, "security_confirm_hint")}
        passwordPlaceholder={tr(lang, "security_wallet_password")}
        confirmLabel={tr(lang, "security_confirm")}
        cancelLabel={tr(lang, "security_cancel")}
        value={reauthPassword}
        onChange={setReauthPassword}
        onConfirm={confirmSensitiveAction}
        onCancel={() => {
          pendingSensitiveActionRef.current = null;
          setWcApproving(false);
          setReauthOpen(false);
          setReauthPassword("");
          setReauthError("");
        }}
        error={reauthError}
      />
    </div>
  );
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
