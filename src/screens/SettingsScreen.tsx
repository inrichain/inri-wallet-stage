import React, { useEffect, useState } from "react";
import { getSecuritySettings, saveSecuritySettings, type SecuritySettings } from "../lib/security";

const AVATAR_KEY = "wallet_avatar";

export default function SettingsScreen({
  theme = "dark",
  setTheme,
  lang = "en",
  setLang,
  security = getSecuritySettings(),
}: {
  theme?: "dark" | "light";
  setTheme: (value: "dark" | "light") => void;
  lang?: string;
  setLang: (value: string) => void;
  security?: SecuritySettings;
}) {
  const isLight = theme === "light";
  const [avatar, setAvatar] = useState<string>(localStorage.getItem(AVATAR_KEY) || "");
  const [securityState, setSecurityState] = useState<SecuritySettings>(security);

  useEffect(() => {
    setSecurityState(security);
  }, [security]);

  function updateSecurity(patch: Partial<SecuritySettings>) {
    const next = { ...securityState, ...patch };
    setSecurityState(next);
    saveSecuritySettings(next);
    window.dispatchEvent(new Event("wallet-security-updated"));
  }

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatar(result);
      localStorage.setItem(AVATAR_KEY, result);
      window.dispatchEvent(new Event("wallet-avatar-updated"));
    };
    reader.readAsDataURL(file);
  }

  function clearAvatar() {
    setAvatar("");
    localStorage.removeItem(AVATAR_KEY);
    window.dispatchEvent(new Event("wallet-avatar-updated"));
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle(isLight)}>
        <div style={titleStyle(isLight)}>Settings</div>
        <div style={subtitleStyle(isLight)}>
          Keep this area focused on app preferences, profile and protection. Networks, WalletConnect and asset logos now live in their own sections under More.
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Appearance</div>
        <div style={rowGridStyle()}>
          <button onClick={() => setTheme("dark")} style={choiceButton(theme === "dark", isLight)}>Dark</button>
          <button onClick={() => setTheme("light")} style={choiceButton(theme === "light", isLight)}>Light</button>
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Language</div>
        <div style={rowGridStyle()}>
          {[
            ["en", "English"],
            ["pt", "Português"],
            ["es", "Español"],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setLang(value)} style={choiceButton(lang === value, isLight)}>{label}</button>
          ))}
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Profile</div>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                overflow: "hidden",
                background: isLight ? "#eef3fb" : "#0d1420",
                border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
                display: "grid",
                placeItems: "center",
              }}
            >
              {avatar ? <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: isLight ? "#5b6578" : "#97a0b3", fontWeight: 800 }}>IMG</span>}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={actionButton(isLight)}>
                Upload avatar
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </label>
              <button onClick={clearAvatar} style={ghostButton(isLight)}>Remove</button>
            </div>
          </div>
          <div style={subtitleStyle(isLight)}>Use a square image for the cleanest result across header, account and share surfaces.</div>
        </div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={sectionTitleStyle(isLight)}>Security</div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={switchRowStyle(isLight)}>
            <div>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Auto-lock</div>
              <div style={subtitleStyle(isLight)}>Lock the wallet after a period of inactivity.</div>
            </div>
            <input type="checkbox" checked={securityState.autoLockEnabled} onChange={(e) => updateSecurity({ autoLockEnabled: e.target.checked })} />
          </label>

          <div>
            <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff", marginBottom: 8 }}>Auto-lock minutes</div>
            <input
              type="number"
              min={1}
              max={240}
              value={securityState.autoLockMinutes}
              onChange={(e) => updateSecurity({ autoLockMinutes: Math.max(1, Number(e.target.value || 5)) })}
              style={inputStyle(isLight)}
            />
          </div>

          <label style={switchRowStyle(isLight)}>
            <div>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Lock hidden balance</div>
              <div style={subtitleStyle(isLight)}>Hide value-sensitive screens behind an extra lock step.</div>
            </div>
            <input type="checkbox" checked={securityState.lockHiddenBalance} onChange={(e) => updateSecurity({ lockHiddenBalance: e.target.checked })} />
          </label>

          <label style={switchRowStyle(isLight)}>
            <div>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Require password for sensitive actions</div>
              <div style={subtitleStyle(isLight)}>Ask for the wallet password before exports and approvals.</div>
            </div>
            <input type="checkbox" checked={securityState.requirePasswordForSensitiveActions} onChange={(e) => updateSecurity({ requirePasswordForSensitiveActions: e.target.checked })} />
          </label>
        </div>
      </section>
    </div>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#ffffff" : "#121621", padding: 16 };
}
function titleStyle(isLight: boolean): React.CSSProperties {
  return { fontSize: 28, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" };
}
function sectionTitleStyle(isLight: boolean): React.CSSProperties {
  return { fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", marginBottom: 12 };
}
function subtitleStyle(isLight: boolean): React.CSSProperties {
  return { color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5, fontSize: 13 };
}
function rowGridStyle(): React.CSSProperties {
  return { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
}
function choiceButton(active: boolean, isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: active ? "1px solid #4d7ef2" : `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
    background: active ? "#3f7cff" : isLight ? "#f8fbff" : "#0f1520",
    color: active ? "#ffffff" : isLight ? "#10131a" : "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  };
}
function actionButton(isLight: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    background: "#3f7cff",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    border: "none",
  };
}
function ghostButton(isLight: boolean): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
    background: isLight ? "#f8fbff" : "#0f1520",
    color: isLight ? "#10131a" : "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  };
}
function switchRowStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`,
    background: isLight ? "#f8fbff" : "#0f1520",
  };
}
function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
    background: isLight ? "#f8fbff" : "#0d1420",
    color: isLight ? "#10131a" : "#ffffff",
    boxSizing: "border-box",
  };
}
