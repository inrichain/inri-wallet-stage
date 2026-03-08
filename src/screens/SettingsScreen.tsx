import React, { useMemo, useRef, useState } from "react";

const BASE = "/inri-wallet-stage/";
const DEFAULT_AVATAR = BASE + "avatar.png";
const WC_LOGS_KEY = "inri_wc_logs";

export default function SettingsScreen({
  theme,
  setTheme,
  lang,
  setLang,
}: {
  theme: "dark" | "light";
  setTheme: (value: "dark" | "light") => void;
  lang: string;
  setLang: (value: string) => void;
}) {
  const isLight = theme === "light";
  const [avatar, setAvatar] = useState(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = getText(lang);

  const wcLogCount = useMemo(() => {
    try {
      const raw = localStorage.getItem(WC_LOGS_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, []);

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;
      localStorage.setItem("wallet_avatar", result);
      setAvatar(result);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    localStorage.removeItem("wallet_avatar");
    setAvatar(DEFAULT_AVATAR);
  }

  async function copyLogs() {
    try {
      const raw = localStorage.getItem(WC_LOGS_KEY) || "[]";
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={heroCard(isLight)}>
        <div style={eyebrow(isLight)}>{t.section}</div>
        <h2 style={heroTitle(isLight)}>{t.settings}</h2>
        <div style={heroText(isLight)}>{t.subtitle}</div>
      </section>

      <section style={gridSection}>
        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.language}</div>
          <div style={subLabelStyle(isLight)}>{t.languageHelp}</div>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={selectStyle(isLight)}>
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
          <div style={subLabelStyle(isLight)}>{t.themeHelp}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => setTheme("dark")} style={themeOption(theme === "dark", isLight)}>{t.dark}</button>
            <button onClick={() => setTheme("light")} style={themeOption(theme === "light", isLight)}>{t.light}</button>
          </div>
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.avatar}</div>
        <div style={subLabelStyle(isLight)}>{t.avatarHelp}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <img
            src={avatar}
            alt="Avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{ width: 84, height: 84, borderRadius: 24, objectFit: "cover", border: `2px solid ${isLight ? "#d9e3f3" : "#22314f"}` }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} style={primaryButton}>{t.changeAvatar}</button>
            <button onClick={removeAvatar} style={secondaryButton(isLight)}>{t.removeAvatar}</button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.walletConnect}</div>
        <div style={subLabelStyle(isLight)}>{t.walletConnectHelp}</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={badge(isLight)}>{wcLogCount} {t.logs}</div>
          <button onClick={copyLogs} style={secondaryButton(isLight)}>
            {copied ? t.copied : t.copyLogs}
          </button>
        </div>
      </section>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      section: "Preferences",
      settings: "Settings",
      subtitle: "Language, look and wallet personalization.",
      language: "Language",
      languageHelp: "Choose the default app language.",
      theme: "Theme",
      themeHelp: "Switch between dark and light mode.",
      dark: "Dark",
      light: "Light",
      avatar: "Avatar",
      avatarHelp: "Pick a profile image stored on this device.",
      changeAvatar: "Change avatar",
      removeAvatar: "Remove avatar",
      walletConnect: "WalletConnect",
      walletConnectHelp: "Use logs to debug sessions and pairings.",
      logs: "logs",
      copyLogs: "Copy debug logs",
      copied: "Copied",
    },
    pt: {
      section: "Preferências",
      settings: "Configurações",
      subtitle: "Idioma, aparência e personalização da carteira.",
      language: "Idioma",
      languageHelp: "Escolha o idioma padrão do aplicativo.",
      theme: "Tema",
      themeHelp: "Alterne entre modo escuro e claro.",
      dark: "Escuro",
      light: "Claro",
      avatar: "Avatar",
      avatarHelp: "Escolha uma imagem salva neste dispositivo.",
      changeAvatar: "Trocar avatar",
      removeAvatar: "Remover avatar",
      walletConnect: "WalletConnect",
      walletConnectHelp: "Use os logs para depurar sessões e pareamentos.",
      logs: "logs",
      copyLogs: "Copiar logs de depuração",
      copied: "Copiado",
    },
  };
  return map[lang] || map.en;
}

const gridSection: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 };
function heroCard(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 26, background: isLight ? "linear-gradient(180deg,#fff 0%, #f8fbff 100%)" : "linear-gradient(180deg,#0f1829 0%, #101827 100%)", padding: 18 }; }
function eyebrow(isLight: boolean): React.CSSProperties { return { color: isLight ? "#55718f" : "#8ba1c8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }; }
function heroTitle(isLight: boolean): React.CSSProperties { return { margin: 0, color: isLight ? "#0a1221" : "#fff", fontSize: 28, fontWeight: 700 }; }
function heroText(isLight: boolean): React.CSSProperties { return { marginTop: 8, color: isLight ? "#60718b" : "#92a5c9", fontSize: 14, lineHeight: 1.5 }; }
function cardStyle(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 24, background: isLight ? "#fff" : "#101827", padding: 16 }; }
function labelStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#09111f" : "#fff", fontWeight: 700, fontSize: 17 }; }
function subLabelStyle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#64748f" : "#90a3c7", fontSize: 13, marginTop: 6, marginBottom: 14, lineHeight: 1.45 }; }
function selectStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#f8fbff" : "#0c1422", color: isLight ? "#09111f" : "#fff", outline: "none" }; }
function themeOption(active: boolean, isLight: boolean): React.CSSProperties { return { padding: "14px 12px", borderRadius: 16, border: active ? "1px solid rgba(79,124,255,.44)" : `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: active ? (isLight ? "#edf2ff" : "rgba(79,124,255,.18)") : (isLight ? "#fff" : "#0c1422"), color: active ? (isLight ? "#234fe2" : "#fff") : (isLight ? "#4d607e" : "#90a3c7"), cursor: "pointer", fontWeight: 700 }; }
const primaryButton: React.CSSProperties = { padding: "12px 14px", borderRadius: 16, border: "none", background: "linear-gradient(180deg,#26a6ff 0%, #4f7cff 100%)", color: "#fff", cursor: "pointer", fontWeight: 700 };
function secondaryButton(isLight: boolean): React.CSSProperties { return { padding: "12px 14px", borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#0c1422", color: isLight ? "#0f1830" : "#fff", cursor: "pointer", fontWeight: 700 }; }
function badge(isLight: boolean): React.CSSProperties { return { padding: "10px 12px", borderRadius: 999, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#f8fbff" : "#0c1422", color: isLight ? "#52657e" : "#92a5c9", fontWeight: 700, fontSize: 13 }; }
