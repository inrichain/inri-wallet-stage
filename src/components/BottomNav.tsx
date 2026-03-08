import React from "react";
import type { Tab } from "./WalletShell";

export default function BottomNav({
  tab,
  setTab,
  theme = "dark",
  lang = "en",
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);

  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "dashboard", icon: "⌂", label: t.home },
    { id: "send", icon: "↑", label: t.send },
    { id: "receive", icon: "↓", label: t.receive },
    { id: "tokens", icon: "◈", label: t.tokens },
    { id: "activity", icon: "≋", label: t.activity },
    { id: "settings", icon: "⚙", label: t.settings },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 10,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 12px max(10px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
          padding: 8,
          borderRadius: 24,
          border: `1px solid ${isLight ? "rgba(213,222,239,.92)" : "rgba(34,49,79,.92)"}`,
          background: isLight ? "rgba(255,255,255,.92)" : "rgba(10,15,27,.92)",
          backdropFilter: "blur(18px)",
          boxShadow: isLight
            ? "0 16px 42px rgba(27,40,79,.10)"
            : "0 20px 50px rgba(0,0,0,.34)",
          pointerEvents: "auto",
        }}
      >
        {items.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                padding: "10px 6px",
                borderRadius: 18,
                border: active
                  ? "1px solid rgba(79,124,255,.44)"
                  : `1px solid ${isLight ? "transparent" : "transparent"}`,
                background: active
                  ? isLight
                    ? "linear-gradient(180deg,#eef4ff 0%, #e6edff 100%)"
                    : "linear-gradient(180deg,rgba(79,124,255,.22) 0%, rgba(20,184,255,.10) 100%)"
                  : "transparent",
                color: active ? (isLight ? "#214ee0" : "#ffffff") : isLight ? "#607089" : "#90a0c4",
                cursor: "pointer",
                transition: "all .18s ease",
                display: "grid",
                placeItems: "center",
                gap: 4,
                minHeight: 58,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.05 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: { home: "Home", send: "Send", receive: "Receive", tokens: "Tokens", activity: "Activity", settings: "Settings" },
    pt: { home: "Início", send: "Enviar", receive: "Receber", tokens: "Tokens", activity: "Atividade", settings: "Ajustes" },
    es: { home: "Inicio", send: "Enviar", receive: "Recibir", tokens: "Tokens", activity: "Actividad", settings: "Ajustes" },
    fr: { home: "Accueil", send: "Envoyer", receive: "Recevoir", tokens: "Tokens", activity: "Activité", settings: "Réglages" },
    de: { home: "Start", send: "Senden", receive: "Empfangen", tokens: "Token", activity: "Aktivität", settings: "Einstellungen" },
    it: { home: "Home", send: "Invia", receive: "Ricevi", tokens: "Token", activity: "Attività", settings: "Impostazioni" },
    ru: { home: "Главная", send: "Отправить", receive: "Получить", tokens: "Токены", activity: "Активность", settings: "Настройки" },
    zh: { home: "首页", send: "发送", receive: "接收", tokens: "代币", activity: "活动", settings: "设置" },
    ja: { home: "ホーム", send: "送信", receive: "受信", tokens: "トークン", activity: "履歴", settings: "設定" },
    ko: { home: "홈", send: "보내기", receive: "받기", tokens: "토큰", activity: "활동", settings: "설정" },
    tr: { home: "Ana", send: "Gönder", receive: "Al", tokens: "Token", activity: "Hareket", settings: "Ayarlar" },
  };
  return map[lang] || map.en;
}
