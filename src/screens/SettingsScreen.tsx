import React, { useEffect, useState } from "react";
import { getSecuritySettings, saveSecuritySettings, type SecuritySettings } from "../lib/security";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import StatusPill from "../components/StatusPill";

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

  useEffect(() => setSecurityState(security), [security]);

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

  const inputClass = `wallet-ui-input ${isLight ? "light" : ""}`.trim();

  return (
    <div className="wallet-screen-stack">
      <ScreenCard theme={theme}>
        <SectionTitle
          theme={theme}
          title="Settings"
          subtitle="Keep this area focused on app preferences, profile and protection. Networks, WalletConnect and asset logos stay in their own sections under More."
          actions={<StatusPill theme={theme} tone="neutral">Clean mode</StatusPill>}
        />
      </ScreenCard>

      <div className="wallet-settings-grid">
        <ScreenCard theme={theme} className="wallet-settings-card-compact">
          <SectionTitle theme={theme} title="Appearance" compact subtitle="Simple theme switching keeps the wallet feeling consistent." />
          <div className="wallet-settings-choice-grid">
            <ActionButton theme={theme} tone={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>Dark</ActionButton>
            <ActionButton theme={theme} tone={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>Light</ActionButton>
          </div>
        </ScreenCard>

        <ScreenCard theme={theme} className="wallet-settings-card-compact">
          <SectionTitle theme={theme} title="Language" compact subtitle="Use one language across the wallet for a calmer interface." />
          <div className="wallet-settings-choice-grid wallet-settings-language-grid">
            {[ ["en", "English"], ["pt", "Português"], ["es", "Español"] ].map(([value, label]) => (
              <ActionButton key={value} theme={theme} tone={lang === value ? "primary" : "secondary"} onClick={() => setLang(value)}>{label}</ActionButton>
            ))}
          </div>
        </ScreenCard>
      </div>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Profile" compact subtitle="A neat square avatar looks best in the header on mobile and desktop." />
        <div className="wallet-profile-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
          <div className="wallet-profile-main">
            <div className="wallet-profile-avatar" style={{ background: isLight ? "#eef3fb" : "#0d1420", borderColor: isLight ? "#dbe2f0" : "#273042" }}>
              {avatar ? <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="wallet-ui-subtle" style={{ fontWeight: 800 }}>IMG</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>Wallet avatar</div>
              <div className="wallet-ui-subtle">This image is used in the header and profile surfaces.</div>
            </div>
          </div>
          <div className="wallet-action-row wallet-profile-actions">
            <ActionButton theme={theme} tone="primary" asLabel>
              Upload avatar
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
            </ActionButton>
            <ActionButton theme={theme} tone="secondary" onClick={clearAvatar}>Remove</ActionButton>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Security" compact subtitle="Protection should feel clear and light, not buried in a dense settings wall." />
        <div className="wallet-security-grid">
          <label style={switchRowStyle(isLight)} className="wallet-security-row">
            <div>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Auto-lock</div>
              <div className="wallet-ui-subtle">Lock the wallet after a period of inactivity.</div>
            </div>
            <input type="checkbox" checked={securityState.autoLockEnabled} onChange={(e) => updateSecurity({ autoLockEnabled: e.target.checked })} />
          </label>

          <div className="wallet-settings-inline-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Auto-lock minutes</div>
              <StatusPill theme={theme} tone="primary">{securityState.autoLockMinutes} min</StatusPill>
            </div>
            <input type="number" min={1} max={240} value={securityState.autoLockMinutes} onChange={(e) => updateSecurity({ autoLockMinutes: Math.max(1, Number(e.target.value || 5)) })} className={inputClass} />
          </div>

          <label style={switchRowStyle(isLight)} className="wallet-security-row">
            <div>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Lock hidden balance</div>
              <div className="wallet-ui-subtle">Hide value-sensitive screens behind an extra lock step.</div>
            </div>
            <input type="checkbox" checked={securityState.lockHiddenBalance} onChange={(e) => updateSecurity({ lockHiddenBalance: e.target.checked })} />
          </label>

          <label style={switchRowStyle(isLight)} className="wallet-security-row">
            <div>
              <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Require password for sensitive actions</div>
              <div className="wallet-ui-subtle">Ask for the wallet password before exports and approvals.</div>
            </div>
            <input type="checkbox" checked={securityState.requirePasswordForSensitiveActions} onChange={(e) => updateSecurity({ requirePasswordForSensitiveActions: e.target.checked })} />
          </label>
        </div>
      </ScreenCard>
    </div>
  );
}

function switchRowStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    border: `1px solid ${isLight ? "#e6ecf5" : "#202635"}`,
    background: isLight ? "#f8fbff" : "#0f1520",
  };
}
