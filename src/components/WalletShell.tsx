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
  const [lang, setLang] = useState<string>(
    () => localStorage.getItem(LANG_KEY) || "en"
  );

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

  useEffect(() => {
    const saved = localStorage.getItem(VAULTS_KEY);
    const currentId = localStorage.getItem(CURRENT_WALLET_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WalletVault[];
        setWallets(parsed);

        if (parsed.length > 0) {
          const found =
            parsed.find((w) => w.id === currentId)?.id || parsed[0].id || "";
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

    ensureFavicon();
  }, [theme, lang]);

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

  const renderTab = () => {
    const address = unlockedWallet?.address || currentWalletMeta?.address || "";
    const mnemonic = unlockedWallet?.mnemonic || "";

    switch (tab) {
      case "dashboard":
        return (
          <DashboardScreen
            setTab={setTab}
            theme={theme}
            lang={lang}
            address={address}
          />
        );

      case "send":
        return (
          <SendScreen
            theme={theme}
            lang={lang}
            address={address}
            mnemonic={mnemonic}
          />
        );

      case "receive":
        return (
          <ReceiveScreen
            theme={theme}
            lang={lang}
            address={address}
          />
        );

      case "tokens":
        return (
          <TokensScreen
            theme={theme}
            lang={lang}
            address={address}
          />
        );

      case "nfts":
        return (
          <NFTsScreen
            theme={theme}
            lang={lang}
            address={address}
          />
        );

      case "activity":
        return (
          <ActivityScreen
            theme={theme}
            lang={lang}
            address={address}
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
            address={address}
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
              : "radial-gradient(circle at top, rgba(63,124,255,.12) 0%, rgba(11,11,15,1) 38%, rgba(6,7,11,1) 100%)",
          color: theme === "light" ? "#10131a" : "#ffffff",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

                <button
                  onClick={generateSeedPhrase}
                  style={secondaryButtonStyle(theme)}
                >
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
        paddingBottom: 88,
        background:
          theme === "light"
            ? "linear-gradient(180deg,#eef3fb 0%, #f7f9fd 100%)"
            : "linear-gradient(180deg,#0b0b0f 0%, #101625 100%)",
      }}
    >
      <Header walletName={currentWalletMeta?.name || "INRI Wallet"} theme={theme} />

      <main style={{ padding: "16px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={lockWallet} style={secondaryButtonStyle(theme)}>
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
      passwordCreate: "Create a password (min. 6 chars)",
      walletName: "Wallet name",
      generatedSeed: "Generated seed phrase",
      generateSeed: "Generate Seed",
      createWallet: "Create Wallet",
      importWallet: "Import Wallet",
      pasteSeed: "Paste seed phrase",
      generateSeedFirst: "Generate seed first.",
      confirmSeedSaveFirst: "Confirm that you saved your seed phrase.",
      passwordShort: "Password must be at least 6 characters.",
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
      seedGenerateError: "Could not generate seed phrase.",
      processing: "Processing...",
      enterPassword: "Enter your password.",
      seedBackupConfirm:
        "I wrote down my seed phrase and stored it somewhere safe. I understand that losing it means losing access to my wallet.",
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
      generateSeed: "Gerar Seed",
      createWallet: "Criar Carteira",
      importWallet: "Importar Carteira",
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
      locked: "Bloqueada.",
      lock: "Travar",
      invalidSeed: "Seed phrase inválida.",
      createFailed: "Não foi possível criar a carteira.",
      seedGenerateError: "Não foi possível gerar a seed phrase.",
      processing: "Processando...",
      enterPassword: "Digite sua senha.",
      seedBackupConfirm:
        "Eu anotei minha seed phrase e guardei em um lugar seguro. Entendo que perder essa frase significa perder o acesso à minha carteira.",
      walletAlreadyExists: "Essa carteira já existe neste dispositivo.",
    },
    es: {
      authSubtitle: "Crea, importa o desbloquea tu billetera",
      unlock: "Desbloquear",
      create: "Crear",
      import: "Importar",
      password: "Ingresa tu contraseña",
      passwordCreate: "Crea una contraseña (mín. 6 caracteres)",
      walletName: "Nombre de la billetera",
      generatedSeed: "Seed phrase generada",
      generateSeed: "Generar Seed",
      createWallet: "Crear Billetera",
      importWallet: "Importar Billetera",
      pasteSeed: "Pega la seed phrase",
      generateSeedFirst: "Primero genera la seed.",
      confirmSeedSaveFirst: "Confirma que guardaste tu seed phrase.",
      passwordShort: "La contraseña debe tener al menos 6 caracteres.",
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
      seedGenerateError: "No se pudo generar la seed phrase.",
      processing: "Procesando...",
      enterPassword: "Ingresa tu contraseña.",
      seedBackupConfirm:
        "Escribí mi seed phrase y la guardé en un lugar seguro. Entiendo que perderla significa perder el acceso a mi billetera.",
      walletAlreadyExists: "Esta billetera ya existe en este dispositivo.",
    },
    fr: {
      authSubtitle: "Créez, importez ou déverrouillez votre portefeuille",
      unlock: "Déverrouiller",
      create: "Créer",
      import: "Importer",
      password: "Entrez votre mot de passe",
      passwordCreate: "Créez un mot de passe (min. 6 caractères)",
      walletName: "Nom du portefeuille",
      generatedSeed: "Phrase seed générée",
      generateSeed: "Générer la Seed",
      createWallet: "Créer le Portefeuille",
      importWallet: "Importer le Portefeuille",
      pasteSeed: "Collez la phrase seed",
      generateSeedFirst: "Générez d'abord la seed.",
      confirmSeedSaveFirst: "Confirmez que vous avez sauvegardé votre phrase seed.",
      passwordShort: "Le mot de passe doit contenir au moins 6 caractères.",
      walletCreated: "Portefeuille créé.",
      walletImported: "Portefeuille importé.",
      wrongPassword: "Mot de passe incorrect.",
      noWallet: "Aucun portefeuille trouvé.",
      noWalletsYet: "Aucun portefeuille pour le moment",
      unlocked: "Déverrouillé.",
      locked: "Verrouillé.",
      lock: "Verrouiller",
      invalidSeed: "Phrase seed invalide.",
      createFailed: "Impossible de créer le portefeuille.",
      seedGenerateError: "Impossible de générer la phrase seed.",
      processing: "Traitement...",
      enterPassword: "Entrez votre mot de passe.",
      seedBackupConfirm:
        "J’ai noté ma phrase seed et je l’ai conservée en lieu sûr. Je comprends que la perdre signifie perdre l’accès à mon portefeuille.",
      walletAlreadyExists: "Ce portefeuille existe déjà sur cet appareil.",
    },
    de: {
      authSubtitle: "Erstellen, importieren oder entsperren Sie Ihre Wallet",
      unlock: "Entsperren",
      create: "Erstellen",
      import: "Importieren",
      password: "Passwort eingeben",
      passwordCreate: "Passwort erstellen (mind. 6 Zeichen)",
      walletName: "Wallet-Name",
      generatedSeed: "Generierte Seed-Phrase",
      generateSeed: "Seed generieren",
      createWallet: "Wallet erstellen",
      importWallet: "Wallet importieren",
      pasteSeed: "Seed-Phrase einfügen",
      generateSeedFirst: "Bitte zuerst eine Seed generieren.",
      confirmSeedSaveFirst: "Bestätigen Sie, dass Sie Ihre Seed-Phrase gespeichert haben.",
      passwordShort: "Das Passwort muss mindestens 6 Zeichen haben.",
      walletCreated: "Wallet erstellt.",
      walletImported: "Wallet importiert.",
      wrongPassword: "Falsches Passwort.",
      noWallet: "Keine Wallet gefunden.",
      noWalletsYet: "Noch keine Wallets",
      unlocked: "Entsperrt.",
      locked: "Gesperrt.",
      lock: "Sperren",
      invalidSeed: "Ungültige Seed-Phrase.",
      createFailed: "Wallet konnte nicht erstellt werden.",
      seedGenerateError: "Seed-Phrase konnte nicht generiert werden.",
      processing: "Wird verarbeitet...",
      enterPassword: "Passwort eingeben.",
      seedBackupConfirm:
        "Ich habe meine Seed-Phrase notiert und sicher aufbewahrt. Ich verstehe, dass ich ohne sie den Zugriff auf meine Wallet verliere.",
      walletAlreadyExists: "Diese Wallet existiert bereits auf diesem Gerät.",
    },
    it: {
      authSubtitle: "Crea, importa o sblocca il tuo wallet",
      unlock: "Sblocca",
      create: "Crea",
      import: "Importa",
      password: "Inserisci la password",
      passwordCreate: "Crea una password (min. 6 caratteri)",
      walletName: "Nome del wallet",
      generatedSeed: "Seed phrase generata",
      generateSeed: "Genera Seed",
      createWallet: "Crea Wallet",
      importWallet: "Importa Wallet",
      pasteSeed: "Incolla la seed phrase",
      generateSeedFirst: "Genera prima la seed.",
      confirmSeedSaveFirst: "Conferma di aver salvato la seed phrase.",
      passwordShort: "La password deve contenere almeno 6 caratteri.",
      walletCreated: "Wallet creato.",
      walletImported: "Wallet importato.",
      wrongPassword: "Password errata.",
      noWallet: "Nessun wallet trovato.",
      noWalletsYet: "Nessun wallet ancora",
      unlocked: "Sbloccato.",
      locked: "Bloccato.",
      lock: "Blocca",
      invalidSeed: "Seed phrase non valida.",
      createFailed: "Impossibile creare il wallet.",
      seedGenerateError: "Impossibile generare la seed phrase.",
      processing: "Elaborazione...",
      enterPassword: "Inserisci la password.",
      seedBackupConfirm:
        "Ho scritto la mia seed phrase e l'ho conservata in un posto sicuro. Capisco che perderla significa perdere l'accesso al wallet.",
      walletAlreadyExists: "Questo wallet esiste già su questo dispositivo.",
    },
    ru: {
      authSubtitle: "Создайте, импортируйте или разблокируйте кошелек",
      unlock: "Разблокировать",
      create: "Создать",
      import: "Импорт",
      password: "Введите пароль",
      passwordCreate: "Создайте пароль (мин. 6 символов)",
      walletName: "Название кошелька",
      generatedSeed: "Сгенерированная seed-фраза",
      generateSeed: "Сгенерировать Seed",
      createWallet: "Создать кошелек",
      importWallet: "Импортировать кошелек",
      pasteSeed: "Вставьте seed-фразу",
      generateSeedFirst: "Сначала сгенерируйте seed-фразу.",
      confirmSeedSaveFirst: "Подтвердите, что вы сохранили seed-фразу.",
      passwordShort: "Пароль должен содержать не менее 6 символов.",
      walletCreated: "Кошелек создан.",
      walletImported: "Кошелек импортирован.",
      wrongPassword: "Неверный пароль.",
      noWallet: "Кошелек не найден.",
      noWalletsYet: "Кошельков пока нет",
      unlocked: "Разблокировано.",
      locked: "Заблокировано.",
      lock: "Заблокировать",
      invalidSeed: "Недействительная seed-фраза.",
      createFailed: "Не удалось создать кошелек.",
      seedGenerateError: "Не удалось сгенерировать seed-фразу.",
      processing: "Обработка...",
      enterPassword: "Введите пароль.",
      seedBackupConfirm:
        "Я записал seed-фразу и сохранил её в безопасном месте. Я понимаю, что потеря этой фразы означает потерю доступа к кошельку.",
      walletAlreadyExists: "Этот кошелек уже существует на этом устройстве.",
    },
    zh: {
      authSubtitle: "创建、导入或解锁您的钱包",
      unlock: "解锁",
      create: "创建",
      import: "导入",
      password: "输入密码",
      passwordCreate: "创建密码（至少 6 位）",
      walletName: "钱包名称",
      generatedSeed: "已生成助记词",
      generateSeed: "生成助记词",
      createWallet: "创建钱包",
      importWallet: "导入钱包",
      pasteSeed: "粘贴助记词",
      generateSeedFirst: "请先生成助记词。",
      confirmSeedSaveFirst: "请确认您已保存助记词。",
      passwordShort: "密码至少需要 6 位字符。",
      walletCreated: "钱包已创建。",
      walletImported: "钱包已导入。",
      wrongPassword: "密码错误。",
      noWallet: "未找到钱包。",
      noWalletsYet: "还没有钱包",
      unlocked: "已解锁。",
      locked: "已锁定。",
      lock: "锁定",
      invalidSeed: "助记词无效。",
      createFailed: "无法创建钱包。",
      seedGenerateError: "无法生成助记词。",
      processing: "处理中...",
      enterPassword: "请输入密码。",
      seedBackupConfirm:
        "我已写下助记词并安全保存。我明白丢失助记词将意味着失去钱包访问权限。",
      walletAlreadyExists: "此钱包已存在于此设备中。",
    },
    ja: {
      authSubtitle: "ウォレットを作成、インポート、またはロック解除",
      unlock: "ロック解除",
      create: "作成",
      import: "インポート",
      password: "パスワードを入力",
      passwordCreate: "パスワードを作成（6文字以上）",
      walletName: "ウォレット名",
      generatedSeed: "生成されたシードフレーズ",
      generateSeed: "シード生成",
      createWallet: "ウォレット作成",
      importWallet: "ウォレットをインポート",
      pasteSeed: "シードフレーズを貼り付け",
      generateSeedFirst: "先にシードを生成してください。",
      confirmSeedSaveFirst: "シードフレーズを保存したことを確認してください。",
      passwordShort: "パスワードは6文字以上必要です。",
      walletCreated: "ウォレットを作成しました。",
      walletImported: "ウォレットをインポートしました。",
      wrongPassword: "パスワードが正しくありません。",
      noWallet: "ウォレットが見つかりません。",
      noWalletsYet: "まだウォレットがありません",
      unlocked: "ロック解除しました。",
      locked: "ロックされました。",
      lock: "ロック",
      invalidSeed: "無効なシードフレーズです。",
      createFailed: "ウォレットを作成できませんでした。",
      seedGenerateError: "シードフレーズを生成できませんでした。",
      processing: "処理中...",
      enterPassword: "パスワードを入力してください。",
      seedBackupConfirm:
        "シードフレーズを書き留めて安全な場所に保管しました。これを失うとウォレットにアクセスできなくなることを理解しています。",
      walletAlreadyExists: "このウォレットはこのデバイスに既に存在します。",
    },
    ko: {
      authSubtitle: "지갑을 생성, 가져오기 또는 잠금 해제하세요",
      unlock: "잠금 해제",
      create: "생성",
      import: "가져오기",
      password: "비밀번호 입력",
      passwordCreate: "비밀번호 생성(최소 6자)",
      walletName: "지갑 이름",
      generatedSeed: "생성된 시드 구문",
      generateSeed: "시드 생성",
      createWallet: "지갑 생성",
      importWallet: "지갑 가져오기",
      pasteSeed: "시드 구문 붙여넣기",
      generateSeedFirst: "먼저 시드를 생성하세요.",
      confirmSeedSaveFirst: "시드 구문을 저장했는지 확인하세요.",
      passwordShort: "비밀번호는 최소 6자 이상이어야 합니다.",
      walletCreated: "지갑이 생성되었습니다.",
      walletImported: "지갑을 가져왔습니다.",
      wrongPassword: "비밀번호가 올바르지 않습니다.",
      noWallet: "지갑을 찾을 수 없습니다.",
      noWalletsYet: "아직 지갑이 없습니다",
      unlocked: "잠금 해제되었습니다.",
      locked: "잠겼습니다.",
      lock: "잠그기",
      invalidSeed: "유효하지 않은 시드 구문입니다.",
      createFailed: "지갑을 생성할 수 없습니다.",
      seedGenerateError: "시드 구문을 생성할 수 없습니다.",
      processing: "처리 중...",
      enterPassword: "비밀번호를 입력하세요.",
      seedBackupConfirm:
        "시드 구문을 적어 안전한 곳에 보관했습니다. 이를 잃어버리면 지갑 접근 권한을 잃는다는 것을 이해합니다.",
      walletAlreadyExists: "이 지갑은 이미 이 기기에 존재합니다.",
    },
    tr: {
      authSubtitle: "Cüzdanınızı oluşturun, içe aktarın veya kilidini açın",
      unlock: "Kilidi Aç",
      create: "Oluştur",
      import: "İçe Aktar",
      password: "Şifrenizi girin",
      passwordCreate: "Bir şifre oluşturun (en az 6 karakter)",
      walletName: "Cüzdan adı",
      generatedSeed: "Oluşturulan seed phrase",
      generateSeed: "Seed Oluştur",
      createWallet: "Cüzdan Oluştur",
      importWallet: "Cüzdanı İçe Aktar",
      pasteSeed: "Seed phrase yapıştırın",
      generateSeedFirst: "Önce seed oluşturun.",
      confirmSeedSaveFirst: "Seed phrase'i kaydettiğinizi onaylayın.",
      passwordShort: "Şifre en az 6 karakter olmalıdır.",
      walletCreated: "Cüzdan oluşturuldu.",
      walletImported: "Cüzdan içe aktarıldı.",
      wrongPassword: "Yanlış şifre.",
      noWallet: "Cüzdan bulunamadı.",
      noWalletsYet: "Henüz cüzdan yok",
      unlocked: "Kilidi açıldı.",
      locked: "Kilitlendi.",
      lock: "Kilitle",
      invalidSeed: "Geçersiz seed phrase.",
      createFailed: "Cüzdan oluşturulamadı.",
      seedGenerateError: "Seed phrase oluşturulamadı.",
      processing: "İşleniyor...",
      enterPassword: "Şifrenizi girin.",
      seedBackupConfirm:
        "Seed phrase'imi yazdım ve güvenli bir yerde sakladım. Bunu kaybetmenin cüzdanıma erişimi kaybetmek anlamına geldiğini anlıyorum.",
      walletAlreadyExists: "Bu cüzdan bu cihazda zaten mevcut.",
    },
  };

  return map[lang] || map.en;
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
    background: active
      ? "#3f7cff"
      : theme === "light"
      ? "#f3f6fc"
      : "#141927",
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
