import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { initWalletConnect } from "../lib/walletconnect";
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
import {
  getMnemonicFromWallet,
  isValidSeedPhrase,
  normalizeSeed,
  shortAddress,
} from "../lib/inri";

const BASE = "/inri-wallet-stage/";
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

  const t = getText(lang);
  const isLight = theme === "light";

  useEffect(() => {
    const saved = localStorage.getItem(VAULTS_KEY);
    const currentId = localStorage.getItem(CURRENT_WALLET_KEY);
    if (!saved) return;

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
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LANG_KEY, lang);
    document.body.style.background = isLight
      ? "linear-gradient(180deg,#eef4fb 0%, #f8fbff 100%)"
      : "linear-gradient(180deg,#080b14 0%, #0d1320 100%)";
    document.body.style.color = isLight ? "#09111f" : "#ffffff";
    document.body.style.margin = "0";
    ensureFavicon();
  }, [theme, lang, isLight]);

  const currentWalletMeta = useMemo(() => {
    if (unlockedWallet) {
      return { id: unlockedWallet.id, name: unlockedWallet.name, address: unlockedWallet.address };
    }
    const currentId = localStorage.getItem(CURRENT_WALLET_KEY);
    return wallets.find((w) => w.id === currentId) || wallets[0] || null;
  }, [wallets, unlockedWallet]);

  const activeAddress = unlockedWallet?.address || currentWalletMeta?.address || "";

  useEffect(() => {
    if (!activeAddress) return;
    initWalletConnect(activeAddress).catch((error) => {
      console.error("WalletConnect init failed", error);
    });
  }, [activeAddress]);

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
    if (!generatedSeed.trim()) return showMessage(t.generateSeedFirst);
    if (!confirmSeedSaved) return showMessage(t.confirmSeedSaveFirst);
    if (!createPassword.trim() || createPassword.trim().length < 6) return showMessage(t.passwordShort);

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
    if (!importSeed.trim()) return showMessage(t.pasteSeed);
    if (!isValidSeedPhrase(importSeed.trim())) return showMessage(t.invalidSeed);
    if (!importPassword.trim() || importPassword.trim().length < 6) return showMessage(t.passwordShort);

    setLoading(true);
    try {
      const normalizedSeed = normalizeSeed(importSeed.trim());
      const baseWallet = ethers.Wallet.fromPhrase(normalizedSeed);
      const encryptedJson = await baseWallet.encrypt(importPassword.trim());
      const alreadyExists = wallets.some((w) => w.address.toLowerCase() === baseWallet.address.toLowerCase());
      if (alreadyExists) {
        showMessage(t.walletAlreadyExists);
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
    if (!vault) return showMessage(t.noWallet);
    if (!unlockPassword.trim()) return showMessage(t.enterPassword);

    setLoading(true);
    try {
      const decrypted = await ethers.Wallet.fromEncryptedJson(vault.encryptedJson, unlockPassword.trim());
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

  const renderTab = () => {
    const address = activeAddress;
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
      case "settings":
        return <SettingsScreen theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />;
      default:
        return <DashboardScreen setTab={setTab} theme={theme} lang={lang} address={address} />;
    }
  };

  if (view === "auth") {
    return (
      <div style={authPage(isLight)}>
        <div style={{ width: "min(480px, 100%)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img
              src={BASE + "token-inri.png"}
              alt="INRI"
              style={{ width: 124, height: 124, objectFit: "contain", display: "block", margin: "0 auto 18px", filter: isLight ? "drop-shadow(0 14px 38px rgba(20,184,255,.18))" : "drop-shadow(0 18px 46px rgba(20,184,255,.26))" }}
            />
            <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, marginBottom: 10 }}>INRI Wallet</div>
            <div style={{ color: isLight ? "#62728d" : "#93a6ca", fontSize: 15 }}>{t.authSubtitle}</div>
          </div>

          <div style={authCard(isLight)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setAuthMode("unlock")} style={tabButtonStyle(authMode === "unlock", theme)}>{t.unlock}</button>
              <button onClick={() => setAuthMode("create")} style={tabButtonStyle(authMode === "create", theme)}>{t.create}</button>
              <button onClick={() => setAuthMode("import")} style={tabButtonStyle(authMode === "import", theme)}>{t.import}</button>
            </div>

            {authMode === "unlock" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <select value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} style={inputStyle(theme)}>
                  {wallets.length === 0 ? <option value="">{t.noWalletsYet}</option> : wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>{wallet.name} — {shortAddress(wallet.address)}</option>
                  ))}
                </select>
                <input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} placeholder={t.password} style={inputStyle(theme)} />
                <button onClick={unlockWallet} style={mainButtonStyle()} disabled={loading || wallets.length === 0}>{loading ? t.processing : t.unlock}</button>
              </div>
            ) : null}

            {authMode === "create" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={t.walletName} style={inputStyle(theme)} />
                <textarea value={generatedSeed} readOnly placeholder={t.generatedSeed} style={textareaStyle(theme)} />
                <button onClick={generateSeedPhrase} style={secondaryButtonStyle(theme)}>{t.generateSeed}</button>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: isLight ? "#4f617d" : "#a0b0cf", lineHeight: 1.45 }}>
                  <input type="checkbox" checked={confirmSeedSaved} onChange={(e) => setConfirmSeedSaved(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>{t.seedBackupConfirm}</span>
                </label>
                <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder={t.passwordCreate} style={inputStyle(theme)} />
                <button onClick={createWallet} style={mainButtonStyle()} disabled={loading}>{loading ? t.processing : t.createWallet}</button>
              </div>
            ) : null}

            {authMode === "import" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <input value={importName} onChange={(e) => setImportName(e.target.value)} placeholder={t.walletName} style={inputStyle(theme)} />
                <textarea value={importSeed} onChange={(e) => setImportSeed(e.target.value)} placeholder={t.pasteSeed} style={textareaStyle(theme)} />
                <input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} placeholder={t.passwordCreate} style={inputStyle(theme)} />
                <button onClick={importWallet} style={mainButtonStyle()} disabled={loading}>{loading ? t.processing : t.importWallet}</button>
              </div>
            ) : null}

            {message ? <div style={{ marginTop: 14, textAlign: "center", color: "#4f7cff", fontWeight: 700, fontSize: 13 }}>{message}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 110, background: isLight ? "linear-gradient(180deg,#eef4fb 0%, #f8fbff 100%)" : "linear-gradient(180deg,#080b14 0%, #0d1320 100%)" }}>
      <Header walletName={currentWalletMeta?.name || "INRI Wallet"} theme={theme} subtitle={`${shortAddress(activeAddress)} • ${t.ready}`} />
      <main style={{ padding: 16, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ color: isLight ? "#61718c" : "#90a3c7", fontSize: 13 }}>{currentWalletMeta?.name || "INRI Wallet"}</div>
          <button onClick={lockWallet} style={secondaryButtonStyle(theme)}>{t.lock}</button>
        </div>
        {renderTab()}
      </main>
      <BottomNav tab={tab} setTab={setTab} theme={theme} lang={lang} />
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      authSubtitle: "Create, import or unlock your wallet",
      unlock: "Unlock",
      create: "Create",
      import: "Import",
      password: "Enter your password",
      passwordCreate: "Create a password (min. 6 chars)",
      walletName: "Wallet name",
      generatedSeed: "Generated seed phrase",
      generateSeed: "Generate Seed",
      createWallet: "Create Wallet",
      importWallet: "Import Wallet",
      pasteSeed: "Paste seed phrase",
      generateSeedFirst: "Generate the seed first.",
      confirmSeedSaveFirst: "Confirm that you saved your seed phrase.",
      passwordShort: "Password must be at least 6 characters.",
      walletCreated: "Wallet created.",
      walletImported: "Wallet imported.",
      wrongPassword: "Wrong password.",
      noWallet: "No wallet found.",
      noWalletsYet: "No wallets yet",
      unlocked: "Unlocked.",
      locked: "Locked.",
      lock: "Lock wallet",
      invalidSeed: "Invalid seed phrase.",
      createFailed: "Could not create wallet.",
      seedGenerateError: "Could not generate seed phrase.",
      processing: "Processing...",
      enterPassword: "Enter your password.",
      ready: "Mainnet ready",
      seedBackupConfirm: "I saved my seed phrase in a secure place and understand that losing it means losing access to my wallet.",
      walletAlreadyExists: "This wallet already exists on this device.",
    },
    pt: {
      authSubtitle: "Crie, importe ou desbloqueie sua carteira",
      unlock: "Desbloquear",
      create: "Criar",
      import: "Importar",
      password: "Digite sua senha",
      passwordCreate: "Crie uma senha (mín. 6 caracteres)",
      walletName: "Nome da carteira",
      generatedSeed: "Seed phrase gerada",
      generateSeed: "Gerar seed",
      createWallet: "Criar carteira",
      importWallet: "Importar carteira",
      pasteSeed: "Cole a seed phrase",
      generateSeedFirst: "Gere a seed primeiro.",
      confirmSeedSaveFirst: "Confirme que você salvou sua seed phrase.",
      passwordShort: "A senha deve ter pelo menos 6 caracteres.",
      walletCreated: "Carteira criada.",
      walletImported: "Carteira importada.",
      wrongPassword: "Senha incorreta.",
      noWallet: "Nenhuma carteira encontrada.",
      noWalletsYet: "Ainda não há carteiras",
      unlocked: "Desbloqueada.",
      locked: "Travada.",
      lock: "Travar carteira",
      invalidSeed: "Seed phrase inválida.",
      createFailed: "Não foi possível criar a carteira.",
      seedGenerateError: "Não foi possível gerar a seed phrase.",
      processing: "Processando...",
      enterPassword: "Digite sua senha.",
      ready: "Mainnet pronta",
      seedBackupConfirm: "Eu salvei minha seed phrase em um lugar seguro e entendo que perdê-la significa perder o acesso à minha carteira.",
      walletAlreadyExists: "Essa carteira já existe neste dispositivo.",
    },
  };
  return map[lang] || map.en;
}

function authPage(isLight: boolean): React.CSSProperties {
  return { minHeight: "100vh", padding: 20, display: "flex", alignItems: "center", justifyContent: "center", background: isLight ? "linear-gradient(180deg,#eef4fb 0%, #f8fbff 100%)" : "radial-gradient(circle at top, rgba(20,184,255,.10) 0%, rgba(8,11,20,1) 38%, rgba(8,11,20,1) 100%)" };
}
function authCard(isLight: boolean): React.CSSProperties {
  return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 30, background: isLight ? "rgba(255,255,255,.94)" : "rgba(16,24,39,.94)", padding: 18, boxShadow: isLight ? "0 18px 44px rgba(20,30,60,.08)" : "0 20px 52px rgba(0,0,0,.32)", backdropFilter: "blur(16px)" };
}
function tabButtonStyle(active: boolean, theme: "dark" | "light"): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 14, border: active ? "1px solid rgba(79,124,255,.44)" : `1px solid ${theme === "light" ? "#dbe3f2" : "#22314f"}`, background: active ? (theme === "light" ? "#edf2ff" : "rgba(79,124,255,.18)") : (theme === "light" ? "#f4f8fd" : "#0c1422"), color: active ? (theme === "light" ? "#234fe2" : "#fff") : (theme === "light" ? "#0f1830" : "#fff"), cursor: "pointer", fontWeight: 700 };
}
function inputStyle(theme: "dark" | "light"): React.CSSProperties {
  return { width: "100%", padding: 14, borderRadius: 16, border: `1px solid ${theme === "light" ? "#dbe3f2" : "#22314f"}`, background: theme === "light" ? "#f8fbff" : "#0c1422", color: theme === "light" ? "#09111f" : "#fff", outline: "none", boxSizing: "border-box" };
}
function textareaStyle(theme: "dark" | "light"): React.CSSProperties {
  return { ...inputStyle(theme), minHeight: 118, resize: "vertical" };
}
function mainButtonStyle(): React.CSSProperties {
  return { width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: "linear-gradient(180deg,#26a6ff 0%, #4f7cff 100%)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15 };
}
function secondaryButtonStyle(theme: "dark" | "light"): React.CSSProperties {
  return { padding: "11px 14px", borderRadius: 14, border: `1px solid ${theme === "light" ? "#dbe3f2" : "#22314f"}`, background: theme === "light" ? "#fff" : "#0c1422", color: theme === "light" ? "#0f1830" : "#fff", cursor: "pointer", fontWeight: 700 };
}
