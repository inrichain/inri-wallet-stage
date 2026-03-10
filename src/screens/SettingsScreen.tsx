import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_NETWORKS,
  getStoredNetwork,
  saveStoredNetwork,
  type NetworkItem,
} from "../lib/network";

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3f7cff"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="60" fill="#0f172a"/>
  <circle cx="60" cy="44" r="22" fill="#fff" opacity="0.95"/>
  <path d="M24 102c7-18 21-28 36-28s29 10 36 28" fill="#fff" opacity="0.95"/>
  <circle cx="60" cy="60" r="54" fill="none" stroke="url(#g)" stroke-width="6"/>
</svg>
`)}`;

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
  const [avatar, setAvatar] = useState<string>(
    localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR
  );
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [customRpc, setCustomRpc] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = getText(lang);

  const activeNetwork = useMemo(
    () => DEFAULT_NETWORKS.find((x) => x.key === networkKey) || DEFAULT_NETWORKS[0],
    [networkKey]
  );

  useEffect(() => {
    const syncAvatar = () => {
      setAvatar(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
    };

    window.addEventListener("storage", syncAvatar);
    window.addEventListener("wallet-avatar-updated", syncAvatar as EventListener);

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener("wallet-avatar-updated", syncAvatar as EventListener);
    };
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
      window.dispatchEvent(new Event("wallet-avatar-updated"));
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeAvatar() {
    localStorage.removeItem("wallet_avatar");
    setAvatar(DEFAULT_AVATAR);
    window.dispatchEvent(new Event("wallet-avatar-updated"));
  }

  function applyNetwork(next: NetworkItem) {
    const payload = customRpc.trim() ? { ...next, rpcUrl: customRpc.trim() } : next;
    saveStoredNetwork(payload);
    setNetworkKey(payload.key);
    window.dispatchEvent(new Event("wallet-network-updated"));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={cardStyle(isLight)}>
        <h2 style={titleStyle(isLight)}>{t.settings}</h2>
        <div style={subtitleStyle(isLight)}>{t.subtitle}</div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.language}</div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={selectStyle(isLight)}
        >
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
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.theme}</div>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as "dark" | "light")}
          style={selectStyle(isLight)}
        >
          <option value="dark">{t.dark}</option>
          <option value="light">{t.light}</option>
        </select>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.network}</div>
        <div style={smallText(isLight)}>{t.networkHint}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          {DEFAULT_NETWORKS.map((item) => {
            const active = item.key === networkKey;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setNetworkKey(item.key);
                  applyNetwork(item);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: active
                    ? "1px solid #4d7ef2"
                    : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                  background: active
                    ? isLight
                      ? "#eef4ff"
                      : "#16213b"
                    : isLight
                      ? "#ffffff"
                      : "#12192a",
                  color: isLight ? "#10131a" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <img
                    src={item.logo}
                    alt={item.name}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallbackApplied) {
                        img.dataset.fallbackApplied = "true";
                        img.src = "/inri-wallet-stage/network-inri.png";
                      }
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      objectFit: "cover",
                      flexShrink: 0,
                      display: "block",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isLight ? "#5b6578" : "#97a0b3",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Chain ID {item.chainId} • {item.symbol}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    color: active ? "#3f7cff" : isLight ? "#64748b" : "#97a0b3",
                    flexShrink: 0,
                  }}
                >
                  {active ? t.active : t.select}
                </div>
              </button>
            );
          })}
        </div>

        <input
          value={customRpc}
          onChange={(e) => setCustomRpc(e.target.value)}
          placeholder={activeNetwork.rpcUrl}
          style={inputStyle(isLight)}
        />

        <button
          onClick={() => applyNetwork(activeNetwork)}
          style={{ ...primaryButtonStyle(), marginTop: 12 }}
        >
          {t.saveRpc}
        </button>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.avatar}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <img
            src={avatar}
            alt="Avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${isLight ? "#dbe2f0" : "#2b3650"}`,
              background: isLight ? "#f8fafc" : "#0f172a",
              display: "block",
            }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={primaryButtonStyle()}
            >
              {t.changeAvatar}
            </button>

            <button
              onClick={removeAvatar}
              style={secondaryButtonStyle(isLight)}
            >
              {t.removeAvatar}
            </button>
          </div>
        </div>

        <div style={smallText(isLight)}>{t.avatarHint}</div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onAvatarChange}
          style={{ display: "none" }}
        />
      </section>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      settings: "Settings",
      subtitle: "Language, theme, network and avatar",
      language: "Language",
      theme: "Theme",
      dark: "Dark Mode",
      light: "Light Mode",
      network: "Active network",
      networkHint:
        "Network switching stays here in one place. Swap and bridge screens use the active network display only.",
      saveRpc: "Save RPC",
      avatar: "Avatar",
      avatarHint:
        "Your avatar is fully personal now. No INRI logo is forced here anymore.",
      changeAvatar: "Upload Avatar",
      removeAvatar: "Remove Avatar",
      active: "Active",
      select: "Select",
    },
    pt: {
      settings: "Configurações",
      subtitle: "Idioma, tema, rede e avatar",
      language: "Idioma",
      theme: "Tema",
      dark: "Modo Escuro",
      light: "Modo Claro",
      network: "Rede ativa",
      networkHint:
        "A troca de rede fica aqui em um só lugar. As telas de swap e bridge usam apenas a rede ativa exibida.",
      saveRpc: "Salvar RPC",
      avatar: "Avatar",
      avatarHint:
        "Seu avatar agora é totalmente pessoal. A logo da INRI não fica mais forçada aqui.",
      changeAvatar: "Enviar Avatar",
      removeAvatar: "Remover Avatar",
      active: "Ativa",
      select: "Selecionar",
    },
    es: {
      settings: "Configuración",
      subtitle: "Idioma, tema, red y avatar",
      language: "Idioma",
      theme: "Tema",
      dark: "Modo oscuro",
      light: "Modo claro",
      network: "Red activa",
      networkHint:
        "El cambio de red queda aquí en un solo lugar. Las pantallas swap y bridge usan solo la red activa mostrada.",
      saveRpc: "Guardar RPC",
      avatar: "Avatar",
      avatarHint:
        "Tu avatar ahora es totalmente personal. El logo de INRI ya no queda forzado aquí.",
      changeAvatar: "Subir Avatar",
      removeAvatar: "Eliminar Avatar",
      active: "Activa",
      select: "Seleccionar",
    },
  };

  return map[lang] || map.en;
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}

function titleStyle(isLight: boolean): React.CSSProperties {
  return {
    margin: 0,
    color: isLight ? "#10131a" : "#fff",
  };
}

function subtitleStyle(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 8,
    color: isLight ? "#5b6578" : "#97a0b3",
  };
}

function labelStyle(isLight: boolean): React.CSSProperties {
  return {
    marginBottom: 10,
    fontWeight: 700,
    color: isLight ? "#10131a" : "#fff",
  };
}

function selectStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#fff" : "#12192a",
    color: isLight ? "#10131a" : "#fff",
    outline: "none",
  };
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 12,
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#fff" : "#12192a",
    color: isLight ? "#10131a" : "#fff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function secondaryButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#fff" : "#121621",
    color: isLight ? "#10131a" : "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function smallText(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 10,
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
    lineHeight: 1.5,
  };
}
