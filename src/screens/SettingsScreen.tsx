import React, { useEffect, useState } from "react";

type SettingsScreenProps = {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  lang: string;
  setLang: (lang: string) => void;
};

const LANGS = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const AVATAR_KEY = "wallet_avatar";

export default function SettingsScreen({
  theme,
  setTheme,
  lang,
  setLang,
}: SettingsScreenProps) {
  const isLight = theme === "light";
  const [avatar, setAvatar] = useState("");

  const t = getText(lang);

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_KEY);
    if (saved) setAvatar(saved);
  }, []);

  function onAvatarFile(file: File | null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatar(result);
      localStorage.setItem(AVATAR_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar("");
    localStorage.removeItem(AVATAR_KEY);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          borderRadius: 20,
          background: isLight ? "#ffffff" : "#121621",
          padding: 16,
        }}
      >
        <h2 style={{ marginTop: 0, color: isLight ? "#10131a" : "#ffffff" }}>
          {t.settings}
        </h2>
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>
          {t.description}
        </div>
      </div>

      <div
        style={{
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          borderRadius: 20,
          background: isLight ? "#ffffff" : "#121621",
          padding: 16,
        }}
      >
        <div style={labelStyle(isLight)}>{t.language}</div>
        <select
          value={lang}
          onChange={(e) => {
            const value = e.target.value;
            setLang(value);
            localStorage.setItem("wallet_lang", value);
          }}
          style={inputStyle(isLight)}
        >
          {LANGS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          borderRadius: 20,
          background: isLight ? "#ffffff" : "#121621",
          padding: 16,
        }}
      >
        <div style={labelStyle(isLight)}>{t.theme}</div>
        <select
          value={theme}
          onChange={(e) => {
            const value = e.target.value as "dark" | "light";
            setTheme(value);
            localStorage.setItem("wallet_theme", value);
          }}
          style={inputStyle(isLight)}
        >
          <option value="dark">{t.darkMode}</option>
          <option value="light">{t.lightMode}</option>
        </select>
      </div>

      <div
        style={{
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          borderRadius: 20,
          background: isLight ? "#ffffff" : "#121621",
          padding: 16,
        }}
      >
        <div style={labelStyle(isLight)}>{t.avatar}</div>

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
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: "hidden",
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: isLight ? "#eef2f8" : "#0d111b",
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
              <span
                style={{
                  color: isLight ? "#10131a" : "#ffffff",
                  fontWeight: 800,
                }}
              >
                U
              </span>
            )}
          </div>

          <label style={buttonStyle()}>
            {t.changeAvatar}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onAvatarFile(e.target.files?.[0] || null)}
            />
          </label>

          <button onClick={removeAvatar} style={secondaryButtonStyle()}>
            {t.removeAvatar}
          </button>
        </div>
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      settings: "Settings",
      description: "Language, theme and avatar",
      language: "Language",
      theme: "Theme",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      avatar: "Avatar",
      changeAvatar: "Change Avatar",
      removeAvatar: "Remove Avatar",
    },
    pt: {
      settings: "Configurações",
      description: "Idioma, tema e avatar",
      language: "Idioma",
      theme: "Tema",
      darkMode: "Modo escuro",
      lightMode: "Modo claro",
      avatar: "Avatar",
      changeAvatar: "Trocar avatar",
      removeAvatar: "Remover avatar",
    },
    es: {
      settings: "Configuración",
      description: "Idioma, tema y avatar",
      language: "Idioma",
      theme: "Tema",
      darkMode: "Modo oscuro",
      lightMode: "Modo claro",
      avatar: "Avatar",
      changeAvatar: "Cambiar avatar",
      removeAvatar: "Eliminar avatar",
    },
  };

  return map[lang] || map.en;
}

function labelStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
    marginBottom: 10,
    fontWeight: 700,
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
  };
}

function buttonStyle(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
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
