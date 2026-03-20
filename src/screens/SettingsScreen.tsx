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
    <div style={{ display: "grid", gap: 16 }}>
      <ScreenCard theme={theme}>
        <SectionTitle
          theme={theme}
          title="Settings"
          subtitle="Keep this area focused on app preferences, profile and protection. Networks, WalletConnect and asset logos stay in their own sections under More."
        />
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Appearance" compact subtitle="A cleaner visual system works best when theme changes stay simple and predictable." />
        <div className="wallet-responsive-2col" style={{ gap: 10 }}>
          <ActionButton theme={theme} tone={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>Dark theme</ActionButton>
          <ActionButton theme={theme} tone={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>Light theme</ActionButton>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Language" compact subtitle="Keep every surface consistent in one language across the wallet." />
        <div className="wallet-responsive-2col" style={{ gap: 10 }}>
          {[["en", "English"], ["pt", "Português"], ["es", "Español"]].map(([value, label]) => (
            <ActionButton key={value} theme={theme} tone={lang === value ? "primary" : "secondary"} onClick={() => setLang(value)}>{label}</ActionButton>
          ))}
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Profile" compact subtitle="Use a square avatar for the cleanest result in the header and account surfaces." />
        <div className="wallet-list-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flexWrap: "wrap" }}>
            <div style={{ width: 74, height: 74, borderRadius: 22, overflow: "hidden", background: isLight ? "#eef3fb" : "#0d1420", border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {avatar ? <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="wallet-ui-subtle" style={{ fontWeight: 800 }}>IMG</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }}>Wallet avatar</div>
              <div className="wallet-ui-subtle">This image is used in the header and profile surfaces.</div>
            </div>
          </div>
          <div className="wallet-action-row">
            <ActionButton theme={theme} tone="primary" asLabel>
              Upload avatar
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
            </ActionButton>
            <ActionButton theme={theme} tone="secondary" onClick={clearAvatar}>Remove</ActionButton>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title="Security" compact subtitle="Protection should feel clear and light, not buried in complicated settings." />
        <label style={switchRowStyle(isLight)}>
          <div>
            <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Auto-lock</div>
            <div className="wallet-ui-subtle">Lock the wallet after a period of inactivity.</div>
          </div>
          <input type="checkbox" checked={securityState.autoLockEnabled} onChange={(e) => updateSecurity({ autoLockEnabled: e.target.checked })} />
        </label>

        <div className="wallet-mobile-stack">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Auto-lock minutes</div>
            <StatusPill theme={theme} tone="primary">{securityState.autoLockMinutes} min</StatusPill>
          </div>
          <input type="number" min={1} max={240} value={securityState.autoLockMinutes} onChange={(e) => updateSecurity({ autoLockMinutes: Math.max(1, Number(e.target.value || 5)) })} className={inputClass} />
        </div>

        <label style={switchRowStyle(isLight)}>
          <div>
            <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Lock hidden balance</div>
            <div className="wallet-ui-subtle">Hide value-sensitive screens behind an extra lock step.</div>
          </div>
          <input type="checkbox" checked={securityState.lockHiddenBalance} onChange={(e) => updateSecurity({ lockHiddenBalance: e.target.checked })} />
        </label>

        <label style={switchRowStyle(isLight)}>
          <div>
            <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#ffffff" }}>Require password for sensitive actions</div>
            <div className="wallet-ui-subtle">Ask for the wallet password before exports and approvals.</div>
          </div>
          <input type="checkbox" checked={securityState.requirePasswordForSensitiveActions} onChange={(e) => updateSecurity({ requirePasswordForSensitiveActions: e.target.checked })} />
        </label>
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
