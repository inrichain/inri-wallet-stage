import React from "react";

export default function SettingsScreen({
  theme,
  setTheme,
  lang,
  setLang,
}: any) {
  const avatar = localStorage.getItem("wallet_avatar") || "";

  function changeAvatar(e: any) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      localStorage.setItem("wallet_avatar", reader.result as string);
      location.reload();
    };

    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>

      <div>
        <h3>Language</h3>

        <select
          value={lang}
          onChange={(e) => {
            localStorage.setItem("wallet_lang", e.target.value);
            setLang(e.target.value);
          }}
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="es">Español</option>
          <option value="zh">中文</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      <div>
        <h3>Theme</h3>

        <select
          value={theme}
          onChange={(e) => {
            localStorage.setItem("wallet_theme", e.target.value);
            setTheme(e.target.value);
          }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div>
        <h3>Avatar</h3>

        <input type="file" onChange={changeAvatar} />

        {avatar && (
          <img
            src={avatar}
            style={{
              width: 80,
              borderRadius: "50%",
              marginTop: 10,
            }}
          />
        )}
      </div>

    </div>
  );
}
