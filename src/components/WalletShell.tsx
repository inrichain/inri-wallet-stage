import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
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

const BASE = "/inri-wallet-stage/";
const VAULTS_KEY = "wallet_vaults_demo";
const CURRENT_WALLET_KEY = "wallet_current_id";
const CURRENT_ADDRESS_KEY = "wallet_address_demo";
const LANG_KEY = "wallet_lang";
const THEME_KEY = "wallet_theme";

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
type AuthMode = "unlock" | "create" | "import";

type WalletItem = {
  id: string;
  name: string;
  password: string;
  mnemonic: string;
  address: string;
};

export default function WalletShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [view, setView] = useState<View>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("unlock");

  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark"
  );
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en");

  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");

  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [generatedSeed, setGeneratedSeed] = useState("");

  const [importName, setImportName] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importSeed, setImportSeed] = useState("");

  const [message, setMessage] = useState("");

  const t = getText(lang);

  useEffect(() => {
    const saved = localStorage.getItem(VAULTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WalletItem[];
        setWallets(parsed);
        if (parsed.length > 0) {
          setSelectedWalletId(parsed[0].id);
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
  }, [theme, lang]);

  function saveWallets(next: WalletItem[]) {
    setWallets(next);
    localStorage.setItem(VAULTS_KEY, JSON.stringify(next));
  }

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  }

  function generateSeedPhrase() {
    const wallet = ethers.Wallet.createRandom();
    const phrase = wallet.mnemonic?.phrase || "";
    setGeneratedSeed(phrase);
  }

  function createWallet() {
    if (!generatedSeed.trim()) {
      showMessage(t.generateSeedFirst);
      return;
    }

    if (!createPassword.trim() || createPassword.trim().length < 4) {
      showMessage(t.passwordShort);
      return;
    }

    try {
      const wallet = ethers.Wallet.fromPhrase(generatedSeed.trim());

      const item: WalletItem = {
        id: "wallet_" + Date.now(),
        name: createName.trim() || `Wallet ${wallets.length + 1}`,
        password: createPassword.trim(),
        mnemonic: generatedSeed.trim(),
        address: wallet.address,
      };

      const next = [...wallets, item];
      saveWallets(next);
      setSelectedWalletId(item.id);
      localStorage.setItem(CURRENT_WALLET_KEY, item.id);
      localStorage.setItem(CURRENT_ADDRESS_KEY, item.address);

      setCreateName("");
      setCreatePassword("");
      setGeneratedSeed("");
      setView("wallet");
      showMessage(t.walletCreated);
    } catch {
      showMessage(t.createFailed);
    }
  }

  function importWallet() {
    if (!importSeed.trim()) {
      showMessage(t.pasteSeed);
      return;
    }

    if (!importPassword.trim() || importPassword.trim().length < 4) {
      showMessage(t.passwordShort);
      return;
    }

    try {
      const wallet = ethers.Wallet.fromPhrase(importSeed.trim());

      const item: WalletItem = {
        id: "wallet_" + Date.now(),
        name: importName.trim() || `Wallet ${wallets.length + 1}`,
        password: importPassword.trim(),
        mnemonic: importSeed.trim(),
        address: wallet.address,
      };

      const next = [...wallets, item];
      saveWallets(next);
      setSelectedWalletId(item.id);
      localStorage.setItem(CURRENT_WALLET_KEY, item.id);
      localStorage.setItem(CURRENT_ADDRESS_KEY, item.address);

      setImportName("");
      setImportPassword("");
      setImportSeed("");
      setView("wallet");
      showMessage(t.walletImported);
    } catch {
      showMessage(t.invalidSeed);
    }
  }

  function unlockWallet() {
    const wallet = wallets.find((w) => w.id === selectedWalletId);
    if (!wallet) {
      showMessage(t.noWallet);
      return;
    }

    if (wallet.password !== unlockPassword.trim()) {
      showMessage(t.wrongPassword);
      return;
    }

    localStorage.setItem(CURRENT_WALLET_KEY, wallet.id);
    localStorage.setItem(CURRENT_ADDRESS_KEY, wallet.address);
    setView("wallet");
    setUnlockPassword("");
    showMessage(t.unlocked);
  }

  function lockWallet() {
    setView("auth");
    showMessage(t.locked);
  }

  const currentWallet = useMemo(() => {
    const currentId = localStorage.getItem(CURRENT_WALLET_KEY);
    return wallets.find((w) => w.id === currentId) || wallets[0];
  }, [wallets, view]);

  const renderTab = () => {
    switch (tab) {
      case "dashboard":
        return (
          <DashboardScreen
            setTab={setTab}
            theme={theme}
            lang={lang}
            address={currentWallet?.address || ""}
          />
        );
      case "send":
        return (
          <SendScreen
            theme={theme}
            lang={lang}
            address={currentWallet?.address || ""}
            mnemonic={currentWallet?.mnemonic || ""}
          />
        );
      case "receive":
        return (
          <ReceiveScreen
            theme={theme}
            lang={lang}
            address={currentWallet?.address || ""}
          />
        );
      case "tokens":
        return (
          <TokensScreen
            theme={theme}
            lang={lang}
            address={currentWallet?.address || ""}
          />
        );
      case "activity":
        return (
          <ActivityScreen
            theme={theme}
            lang={lang}
            address={currentWallet?.address || ""}
          />
        );
      case "swap":
        return <SwapScreen />;
      case "bridge":
        return <BridgeScreen />;
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
        return (
          <DashboardScreen
            setTab={setTab}
            theme={theme}
            lang={lang}
            address={currentWallet?.address || ""}
          />
        );
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
              : "linear-gradient(180deg,#0b0b0f 0%, #06070b 100%)",
          color: theme === "light" ? "#10131a" : "#ffffff",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "min(420px, 100%)" }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <img
              src={BASE + "token-inri.png"}
              alt="INRI"
              style={{
                width: 140,
                height: 140,
                objectFit: "contain",
                margin: "0 auto 18px",
                display: "block",
                filter: "drop-shadow(0 12px 30px rgba(63,124,255,.25))",
              }}
            />

            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: 12,
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
              borderRadius: 28,
              background: theme === "light" ? "#ffffff" : "#121621",
              padding: 18,
              boxShadow:
                theme === "light"
                  ? "0 18px 40px rgba(20,30,60,.08)"
                  : "0 18px 40px rgba(0,0,0,.28)",
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
              <button onClick={() => setAuthMode("unlock")} style={tabButtonStyle(authMode === "unlock")}>
                {t.unlock}
              </button>
              <button onClick={() => setAuthMode("create")} style={tabButtonStyle(authMode === "create")}>
                {t.create}
              </button>
              <button onClick={() => setAuthMode("import")} style={tabButtonStyle(authMode === "import")}>
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
                        {wallet.name}
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

                <button onClick={unlockWallet} style={mainButtonStyle()}>
                  {t.unlock}
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

                <button onClick={generateSeedPhrase} style={secondaryButtonStyle()}>
                  {t.generateSeed}
                </button>

                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder={t.password}
                  style={inputStyle(theme)}
                />

                <button onClick={createWallet} style={mainButtonStyle()}>
                  {t.createWallet}
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
                  placeholder={t.password}
                  style={inputStyle(theme)}
                />

                <button onClick={importWallet} style={mainButtonStyle()}>
                  {t.importWallet}
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
        paddingBottom: 88,
        background:
          theme === "light"
            ? "linear-gradient(180deg,#eef3fb 0%, #f7f9fd 100%)"
            : "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)",
      }}
    >
      <Header walletName={currentWallet?.name || "INRI Wallet"} theme={theme} />

      <main style={{ padding: "16px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={lockWallet} style={secondaryButtonStyle()}>
            {t.lock}
          </button>
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
      walletName: "Wallet name",
      generatedSeed: "Generated seed phrase",
      generateSeed: "Generate Seed",
      createWallet: "Create Wallet",
      importWallet: "Import Wallet",
      pasteSeed: "Paste seed phrase",
      generateSeedFirst: "Generate seed first.",
      passwordShort: "Password must be at least 4 chars.",
      walletCreated: "Wallet created.",
      walletImported: "Wallet imported.",
      wrongPassword: "Wrong password.",
      noWallet: "No wallet found.",
      noWalletsYet: "No wallets yet",
      unlocked: "Unlocked.",
      locked: "Locked.",
      lock: "Lock",
      invalidSeed: "Invalid seed phrase.",
      createFailed: "Could not create wallet.",
    },
    pt: {
      authSubtitle: "Crie, importe ou desbloqueie sua carteira",
      unlock: "Desbloquear",
      create: "Criar",
      import: "Importar",
      password: "Digite sua senha",
      walletName: "Nome da carteira",
      generatedSeed: "Seed phrase gerada",
      generateSeed: "Gerar Seed",
      createWallet: "Criar Carteira",
      importWallet: "Importar Carteira",
      pasteSeed: "Cole a seed phrase",
      generateSeedFirst: "Gere a seed primeiro.",
      passwordShort: "A senha deve ter pelo menos 4 caracteres.",
      walletCreated: "Carteira criada.",
      walletImported: "Carteira importada.",
      wrongPassword: "Senha incorreta.",
      noWallet: "Nenhuma carteira encontrada.",
      noWalletsYet: "Ainda não há carteiras",
      unlocked: "Desbloqueada.",
      locked: "Bloqueada.",
      lock: "Travar",
      invalidSeed: "Seed phrase inválida.",
      createFailed: "Não foi possível criar a carteira.",
    },
    es: {
      authSubtitle: "Crea, importa o desbloquea tu billetera",
      unlock: "Desbloquear",
      create: "Crear",
      import: "Importar",
      password: "Ingresa tu contraseña",
      walletName: "Nombre de la billetera",
      generatedSeed: "Seed phrase generada",
      generateSeed: "Generar Seed",
      createWallet: "Crear Billetera",
      importWallet: "Importar Billetera",
      pasteSeed: "Pega la seed phrase",
      generateSeedFirst: "Primero genera la seed.",
      passwordShort: "La contraseña debe tener al menos 4 caracteres.",
      walletCreated: "Billetera creada.",
      walletImported: "Billetera importada.",
      wrongPassword: "Contraseña incorrecta.",
      noWallet: "No se encontró billetera.",
      noWalletsYet: "Aún no hay billeteras",
      unlocked: "Desbloqueada.",
      locked: "Bloqueada.",
      lock: "Bloquear",
      invalidSeed: "Seed phrase inválida.",
      createFailed: "No se pudo crear la billetera.",
    },
  };

  return map[lang] || map.en;
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: active ? "1px solid #4d7ef2" : "1px solid #252b39",
    background: active ? "#3f7cff" : "#141927",
    color: "#fff",
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
  };
}

function textareaStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 96,
    padding: 13,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "#f6f8fc" : "#0d111b",
    color: theme === "light" ? "#10131a" : "#ffffff",
    outline: "none",
    resize: "vertical",
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

function secondaryButtonStyle(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #252b39",
    background: "#1b2741",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}
