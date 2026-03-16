import React, { useMemo, useState } from "react";

type InstallMode = "extension" | "mobile" | "web";

export default function InstallScreen({
  theme = "dark",
  lang = "en",
}: {
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const [mode, setMode] = useState<InstallMode>("extension");

  const t = useMemo(() => getText(lang), [lang]);

  const chromeUrl = "https://wallet.inri.life";
  const firefoxUrl = "https://wallet.inri.life";
  const braveUrl = "https://wallet.inri.life";
  const operaUrl = "https://wallet.inri.life";
  const edgeUrl = "https://wallet.inri.life";

  async function handleInstallPwa() {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) {
      alert(t.installNotAvailable);
      return;
    }

    await deferredPrompt.prompt();
    (window as any).deferredPrompt = null;
  }

  return (
    <div
      style={{
        minHeight: "100%",
        display: "grid",
        placeItems: "start center",
      }}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          display: "grid",
          gap: 22,
        }}
      >
        <div
          style={{
            border: `1px solid ${isLight ? "#ead6cf" : "#3a2446"}`,
            borderRadius: 20,
            background: isLight ? "#f7c1a8" : "#1d1130",
            padding: 12,
            display: "inline-grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            width: "min(540px, 100%)",
          }}
        >
          <button
            onClick={() => setMode("extension")}
            style={tabStyle(mode === "extension", isLight)}
          >
            {t.browserExtension}
          </button>

          <button
            onClick={() => setMode("mobile")}
            style={tabStyle(mode === "mobile", isLight)}
          >
            {t.mobileApp}
          </button>

          <button
            onClick={() => setMode("web")}
            style={tabStyle(mode === "web", isLight)}
          >
            {t.web}
          </button>
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 7vw, 72px)",
              lineHeight: 1.02,
              fontWeight: 900,
              color: isLight ? "#2a0a43" : "#ffffff",
              textAlign: "center",
              letterSpacing: "-0.04em",
            }}
          >
            {mode === "extension"
              ? t.extensionTitle
              : mode === "mobile"
              ? t.mobileTitle
              : t.webTitle}
          </h1>
        </div>

        {mode === "extension" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 18,
            }}
          >
            <BrowserCard
              label="Chrome"
              icon="🌐"
              href={chromeUrl}
              text={t.openSite}
              isLight={isLight}
            />
            <BrowserCard
              label="Firefox"
              icon="🦊"
              href={firefoxUrl}
              text={t.openSite}
              isLight={isLight}
            />
            <BrowserCard
              label="Brave"
              icon="🦁"
              href={braveUrl}
              text={t.openSite}
              isLight={isLight}
            />
            <BrowserCard
              label="Opera"
              icon="⭕"
              href={operaUrl}
              text={t.openSite}
              isLight={isLight}
            />
            <BrowserCard
              label="Edge"
              icon="🌊"
              href={edgeUrl}
              text={t.openSite}
              isLight={isLight}
            />
          </div>
        ) : null}

        {mode === "mobile" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <div style={mobileCardStyle(isLight)}>
              <div style={mobileTitleStyle(isLight)}>{t.android}</div>
              <div style={mobileTextStyle(isLight)}>{t.androidSteps}</div>

              <button onClick={handleInstallPwa} style={installButtonStyle()}>
                {t.installNow}
              </button>
            </div>

            <div style={mobileCardStyle(isLight)}>
              <div style={mobileTitleStyle(isLight)}>{t.iphone}</div>
              <div style={mobileTextStyle(isLight)}>{t.iphoneSteps}</div>

              <a
                href="https://wallet.inri.life"
                target="_blank"
                rel="noreferrer"
                style={linkButtonStyle()}
              >
                {t.openSafari}
              </a>
            </div>
          </div>
        ) : null}

        {mode === "web" ? (
          <div
            style={{
              border: `1px solid ${isLight ? "#ead6cf" : "#3a2446"}`,
              borderRadius: 24,
              background: isLight ? "rgba(255,255,255,.55)" : "#1a1226",
              padding: 24,
              display: "grid",
              gap: 16,
              justifyItems: "start",
            }}
          >
            <div
              style={{
                color: isLight ? "#3a0c56" : "#ffffff",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {t.webAccess}
            </div>

            <div
              style={{
                color: isLight ? "#5f3b63" : "#d1c5de",
                lineHeight: 1.65,
                fontSize: 15,
              }}
            >
              {t.webDescription}
            </div>

            <a
              href="https://wallet.inri.life"
              target="_blank"
              rel="noreferrer"
              style={linkButtonStyle()}
            >
              {t.openWallet}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BrowserCard({
  label,
  icon,
  href,
  text,
  isLight,
}: {
  label: string;
  icon: string;
  href: string;
  text: string;
  isLight: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: "none",
        border: `1px solid ${isLight ? "#ead6cf" : "#3a2446"}`,
        borderRadius: 24,
        background: isLight ? "rgba(255,255,255,.45)" : "#1a1226",
        padding: 24,
        display: "grid",
        justifyItems: "center",
        gap: 12,
        minHeight: 220,
      }}
    >
      <div style={{ fontSize: 58 }}>{icon}</div>

      <div
        style={{
          color: isLight ? "#2a0a43" : "#ffffff",
          fontSize: 28,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: isLight ? "#6a4468" : "#cbbdd8",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </a>
  );
}

function tabStyle(active: boolean, isLight: boolean): React.CSSProperties {
  return {
    padding: "14px 18px",
    borderRadius: 14,
    border: active ? "2px solid #4d7ef2" : "1px solid transparent",
    background: active ? "#2c0347" : "transparent",
    color: active ? "#ffffff" : isLight ? "#2a0a43" : "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
  };
}

function mobileCardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#ead6cf" : "#3a2446"}`,
    borderRadius: 24,
    background: isLight ? "rgba(255,255,255,.45)" : "#1a1226",
    padding: 24,
    display: "grid",
    gap: 14,
  };
}

function mobileTitleStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#2a0a43" : "#ffffff",
    fontSize: 24,
    fontWeight: 800,
  };
}

function mobileTextStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#6a4468" : "#cbbdd8",
    lineHeight: 1.7,
    fontSize: 15,
  };
}

function installButtonStyle(): React.CSSProperties {
  return {
    padding: "14px 18px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
  };
}

function linkButtonStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 18px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 15,
  };
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      browserExtension: "Browser Extension",
      mobileApp: "Mobile App",
      web: "Web",
      extensionTitle: "Install INRI Wallet for your browser",
      mobileTitle: "Install INRI Wallet on your mobile device",
      webTitle: "Open INRI Wallet on the web",
      openSite: "Open wallet site and install or pin it",
      android: "Android",
      iphone: "iPhone",
      androidSteps:
        "Open wallet.inri.life in Chrome on Android, then use Install App or Add to Home screen.",
      iphoneSteps:
        "Open wallet.inri.life in Safari, tap Share, then Add to Home Screen.",
      installNow: "Install Now",
      openSafari: "Open in Safari",
      webAccess: "Web access",
      webDescription:
        "Use INRI Wallet directly in your browser with the same professional interface and multichain experience.",
      openWallet: "Open Wallet",
      installNotAvailable:
        "Install is not available yet on this device. Open the site in Chrome or use Add to Home screen.",
    },
    pt: {
      browserExtension: "Extensão do Navegador",
      mobileApp: "App Mobile",
      web: "Web",
      extensionTitle: "Instale a INRI Wallet no seu navegador",
      mobileTitle: "Instale a INRI Wallet no seu celular",
      webTitle: "Abra a INRI Wallet na web",
      openSite: "Abra o site da wallet e instale ou fixe",
      android: "Android",
      iphone: "iPhone",
      androidSteps:
        "Abra wallet.inri.life no Chrome do Android e depois use Instalar app ou Adicionar à tela inicial.",
      iphoneSteps:
        "Abra wallet.inri.life no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.",
      installNow: "Instalar Agora",
      openSafari: "Abrir no Safari",
      webAccess: "Acesso web",
      webDescription:
        "Use a INRI Wallet diretamente no navegador com a mesma interface profissional e experiência multichain.",
      openWallet: "Abrir Wallet",
      installNotAvailable:
        "A instalação ainda não está disponível neste aparelho. Abra o site no Chrome ou use Adicionar à tela inicial.",
    },
    es: {
      browserExtension: "Extensión del Navegador",
      mobileApp: "App Móvil",
      web: "Web",
      extensionTitle: "Instala INRI Wallet en tu navegador",
      mobileTitle: "Instala INRI Wallet en tu móvil",
      webTitle: "Abre INRI Wallet en la web",
      openSite: "Abre el sitio de la wallet e instálala o fíjala",
      android: "Android",
      iphone: "iPhone",
      androidSteps:
        "Abre wallet.inri.life en Chrome para Android y luego usa Instalar app o Añadir a la pantalla de inicio.",
      iphoneSteps:
        "Abre wallet.inri.life en Safari, toca Compartir y luego Añadir a pantalla de inicio.",
      installNow: "Instalar Ahora",
      openSafari: "Abrir en Safari",
      webAccess: "Acceso web",
      webDescription:
        "Usa INRI Wallet directamente en el navegador con la misma interfaz profesional y experiencia multichain.",
      openWallet: "Abrir Wallet",
      installNotAvailable:
        "La instalación aún no está disponible en este dispositivo. Abre el sitio en Chrome o usa Añadir a pantalla de inicio.",
    },
  };

  return map[lang] || map.en;
}
