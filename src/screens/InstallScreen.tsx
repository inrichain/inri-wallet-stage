import React, { useMemo, useState } from "react";

type InstallMode = "mobile" | "browser" | "web";

export default function InstallScreen({
  theme = "dark",
  lang = "en",
}: {
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const [mode, setMode] = useState<InstallMode>("mobile");
  const t = useMemo(() => getText(lang), [lang]);

  async function handleInstallNow() {
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
        display: "grid",
        gap: 18,
      }}
    >
      <div style={heroCardStyle(isLight)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                lineHeight: 1.02,
                color: isLight ? "#10131a" : "#ffffff",
                letterSpacing: "-0.03em",
              }}
            >
              {t.title}
            </div>

            <div
              style={{
                color: isLight ? "#5b6578" : "#97a0b3",
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              {t.subtitle}
            </div>
          </div>

          <button onClick={handleInstallNow} style={mainButtonStyle()}>
            {t.installNow}
          </button>
        </div>
      </div>

      <div style={tabWrapStyle(isLight)}>
        <button onClick={() => setMode("mobile")} style={tabStyle(mode === "mobile", isLight)}>
          {t.mobile}
        </button>

        <button onClick={() => setMode("browser")} style={tabStyle(mode === "browser", isLight)}>
          {t.browser}
        </button>

        <button onClick={() => setMode("web")} style={tabStyle(mode === "web", isLight)}>
          {t.web}
        </button>
      </div>

      {mode === "mobile" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          <div style={cardStyle(isLight)}>
            <div style={sectionTitleStyle(isLight)}>{t.android}</div>
            <div style={sectionTextStyle(isLight)}>{t.androidText}</div>

            <div style={stepsWrapStyle}>
              <Step n="1" text={t.androidStep1} isLight={isLight} />
              <Step n="2" text={t.androidStep2} isLight={isLight} />
              <Step n="3" text={t.androidStep3} isLight={isLight} />
            </div>

            <button onClick={handleInstallNow} style={mainButtonStyle()}>
              {t.installOnAndroid}
            </button>
          </div>

          <div style={cardStyle(isLight)}>
            <div style={sectionTitleStyle(isLight)}>{t.iphone}</div>
            <div style={sectionTextStyle(isLight)}>{t.iphoneText}</div>

            <div style={stepsWrapStyle}>
              <Step n="1" text={t.iphoneStep1} isLight={isLight} />
              <Step n="2" text={t.iphoneStep2} isLight={isLight} />
              <Step n="3" text={t.iphoneStep3} isLight={isLight} />
              <Step n="4" text={t.iphoneStep4} isLight={isLight} />
            </div>

            <a
              href="https://wallet.inri.life"
              target="_blank"
              rel="noreferrer"
              style={linkButtonStyle()}
            >
              {t.openInSafari}
            </a>
          </div>
        </div>
      ) : null}

      {mode === "browser" ? (
        <div style={cardStyle(isLight)}>
          <div style={sectionTitleStyle(isLight)}>{t.browserTitle}</div>
          <div style={sectionTextStyle(isLight)}>{t.browserText}</div>

          <div style={stepsWrapStyle}>
            <Step n="1" text={t.browserStep1} isLight={isLight} />
            <Step n="2" text={t.browserStep2} isLight={isLight} />
            <Step n="3" text={t.browserStep3} isLight={isLight} />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <button onClick={handleInstallNow} style={mainButtonStyle()}>
              {t.installNow}
            </button>

            <a
              href="https://wallet.inri.life"
              target="_blank"
              rel="noreferrer"
              style={secondaryLinkStyle(isLight)}
            >
              {t.openWalletSite}
            </a>
          </div>
        </div>
      ) : null}

      {mode === "web" ? (
        <div style={cardStyle(isLight)}>
          <div style={sectionTitleStyle(isLight)}>{t.webTitle}</div>
          <div style={sectionTextStyle(isLight)}>{t.webText}</div>

          <div style={stepsWrapStyle}>
            <Step n="1" text={t.webStep1} isLight={isLight} />
            <Step n="2" text={t.webStep2} isLight={isLight} />
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

      <div style={noteStyle(isLight)}>{t.note}</div>
    </div>
  );
}

function Step({
  n,
  text,
  isLight,
}: {
  n: string;
  text: string;
  isLight: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px 1fr",
        gap: 12,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          display: "grid",
          placeItems: "center",
          background: "#3f7cff",
          color: "#ffffff",
          fontWeight: 900,
          fontSize: 14,
        }}
      >
        {n}
      </div>

      <div
        style={{
          color: isLight ? "#334155" : "#d3daea",
          lineHeight: 1.6,
          fontSize: 14,
          paddingTop: 4,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function heroCardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 24,
    background: isLight ? "#ffffff" : "#121621",
    padding: 20,
  };
}

function tabWrapStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "inline-grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    width: "min(520px, 100%)",
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 18,
    background: isLight ? "#ffffff" : "#121621",
    padding: 8,
  };
}

function tabStyle(active: boolean, isLight: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 12,
    border: active
      ? "1px solid #4d7ef2"
      : `1px solid ${isLight ? "transparent" : "transparent"}`,
    background: active ? "#3f7cff" : "transparent",
    color: active ? "#ffffff" : isLight ? "#334155" : "#d3daea",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
  };
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 24,
    background: isLight ? "#ffffff" : "#121621",
    padding: 20,
    display: "grid",
    gap: 16,
  };
}

function sectionTitleStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#10131a" : "#ffffff",
    fontWeight: 900,
    fontSize: 24,
    lineHeight: 1.1,
  };
}

function sectionTextStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    lineHeight: 1.7,
    fontSize: 15,
  };
}

const stepsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

function mainButtonStyle(): React.CSSProperties {
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

function secondaryLinkStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 18px",
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#1b2741",
    color: isLight ? "#10131a" : "#ffffff",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 15,
  };
}

function noteStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px dashed ${isLight ? "#cbd5e1" : "#334155"}`,
    borderRadius: 18,
    background: isLight ? "#f8fafc" : "#0b1120",
    padding: 16,
    color: isLight ? "#475569" : "#cbd5e1",
    lineHeight: 1.65,
    fontSize: 14,
  };
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      title: "Install INRI Wallet",
      subtitle:
        "Choose the best way to use INRI Wallet on your phone, browser or web. The wallet works as a professional web app and can also be installed on supported devices.",
      installNow: "Install Now",
      mobile: "Mobile",
      browser: "Browser",
      web: "Web",

      android: "Android",
      iphone: "iPhone",
      androidText:
        "Use the wallet as an installed app on Android for faster access and a cleaner full-screen experience.",
      iphoneText:
        "On iPhone, the wallet can be added to your Home Screen and used like an app through Safari.",

      androidStep1: "Open wallet.inri.life in Chrome on Android.",
      androidStep2: "Tap the browser menu and choose Install app or Add to Home screen.",
      androidStep3: "Confirm the installation and open the wallet from your apps.",

      iphoneStep1: "Open wallet.inri.life in Safari.",
      iphoneStep2: "Tap the Share button.",
      iphoneStep3: "Choose Add to Home Screen.",
      iphoneStep4: "Tap Add and open the wallet from your Home Screen.",

      installOnAndroid: "Install on Android",
      openInSafari: "Open in Safari",

      browserTitle: "Install in your browser",
      browserText:
        "On supported desktop browsers, INRI Wallet can be installed as an app for quick access, a standalone window and a cleaner experience.",
      browserStep1: "Open wallet.inri.life in a supported browser.",
      browserStep2: "Use the install button in the address bar or the install button below.",
      browserStep3: "Confirm and launch the wallet as an installed app.",
      openWalletSite: "Open Wallet Site",

      webTitle: "Use on the web",
      webText:
        "You can always use INRI Wallet directly in your browser with the same secure interface and multichain experience.",
      webStep1: "Open wallet.inri.life in your browser.",
      webStep2: "Unlock, create or import your wallet and use it normally.",
      openWallet: "Open Wallet",

      note:
        "If installation is not available yet, open the site in the recommended browser and try again after the page fully loads.",
      installNotAvailable:
        "Installation is not available on this device yet. Open the site in the recommended browser and try again.",
    },

    pt: {
      title: "Instalar INRI Wallet",
      subtitle:
        "Escolha a melhor forma de usar a INRI Wallet no celular, navegador ou web. A wallet funciona como app profissional na web e também pode ser instalada em aparelhos compatíveis.",
      installNow: "Instalar Agora",
      mobile: "Mobile",
      browser: "Navegador",
      web: "Web",

      android: "Android",
      iphone: "iPhone",
      androidText:
        "Use a wallet como app instalado no Android para acesso mais rápido e uma experiência mais limpa em tela cheia.",
      iphoneText:
        "No iPhone, a wallet pode ser adicionada à Tela de Início e usada como app pelo Safari.",

      androidStep1: "Abra wallet.inri.life no Chrome do Android.",
      androidStep2: "Toque no menu do navegador e escolha Instalar app ou Adicionar à tela inicial.",
      androidStep3: "Confirme a instalação e abra a wallet pelos seus apps.",

      iphoneStep1: "Abra wallet.inri.life no Safari.",
      iphoneStep2: "Toque no botão Compartilhar.",
      iphoneStep3: "Escolha Adicionar à Tela de Início.",
      iphoneStep4: "Toque em Adicionar e abra a wallet na sua Tela de Início.",

      installOnAndroid: "Instalar no Android",
      openInSafari: "Abrir no Safari",

      browserTitle: "Instalar no navegador",
      browserText:
        "Em navegadores compatíveis no desktop, a INRI Wallet pode ser instalada como app para acesso rápido, janela separada e experiência mais limpa.",
      browserStep1: "Abra wallet.inri.life em um navegador compatível.",
      browserStep2: "Use o botão de instalar da barra de endereço ou o botão abaixo.",
      browserStep3: "Confirme e abra a wallet como app instalado.",
      openWalletSite: "Abrir Site da Wallet",

      webTitle: "Usar na web",
      webText:
        "Você sempre pode usar a INRI Wallet diretamente no navegador com a mesma interface segura e experiência multichain.",
      webStep1: "Abra wallet.inri.life no seu navegador.",
      webStep2: "Desbloqueie, crie ou importe sua wallet e use normalmente.",
      openWallet: "Abrir Wallet",

      note:
        "Se a instalação ainda não estiver disponível, abra o site no navegador recomendado e tente novamente depois que a página terminar de carregar.",
      installNotAvailable:
        "A instalação ainda não está disponível neste aparelho. Abra o site no navegador recomendado e tente novamente.",
    },

    es: {
      title: "Instalar INRI Wallet",
      subtitle:
        "Elige la mejor forma de usar INRI Wallet en tu móvil, navegador o web. La wallet funciona como una app web profesional y también puede instalarse en dispositivos compatibles.",
      installNow: "Instalar Ahora",
      mobile: "Móvil",
      browser: "Navegador",
      web: "Web",

      android: "Android",
      iphone: "iPhone",
      androidText:
        "Usa la wallet como app instalada en Android para un acceso más rápido y una experiencia más limpia en pantalla completa.",
      iphoneText:
        "En iPhone, la wallet puede añadirse a la pantalla de inicio y usarse como app mediante Safari.",

      androidStep1: "Abre wallet.inri.life en Chrome para Android.",
      androidStep2: "Toca el menú del navegador y elige Instalar app o Añadir a pantalla de inicio.",
      androidStep3: "Confirma la instalación y abre la wallet desde tus apps.",

      iphoneStep1: "Abre wallet.inri.life en Safari.",
      iphoneStep2: "Toca el botón Compartir.",
      iphoneStep3: "Elige Añadir a pantalla de inicio.",
      iphoneStep4: "Toca Añadir y abre la wallet desde tu pantalla de inicio.",

      installOnAndroid: "Instalar en Android",
      openInSafari: "Abrir en Safari",

      browserTitle: "Instalar en el navegador",
      browserText:
        "En navegadores compatibles de escritorio, INRI Wallet puede instalarse como app para acceso rápido, ventana independiente y una experiencia más limpia.",
      browserStep1: "Abre wallet.inri.life en un navegador compatible.",
      browserStep2: "Usa el botón de instalar de la barra de direcciones o el botón inferior.",
      browserStep3: "Confirma y abre la wallet como app instalada.",
      openWalletSite: "Abrir Sitio de la Wallet",

      webTitle: "Usar en la web",
      webText:
        "Siempre puedes usar INRI Wallet directamente en tu navegador con la misma interfaz segura y experiencia multichain.",
      webStep1: "Abre wallet.inri.life en tu navegador.",
      webStep2: "Desbloquea, crea o importa tu wallet y úsala normalmente.",
      openWallet: "Abrir Wallet",

      note:
        "Si la instalación aún no está disponible, abre el sitio en el navegador recomendado y vuelve a intentarlo después de que la página cargue por completo.",
      installNotAvailable:
        "La instalación aún no está disponible en este dispositivo. Abre el sitio en el navegador recomendado e inténtalo de nuevo.",
    },
  };

  return map[lang] || map.en;
}
