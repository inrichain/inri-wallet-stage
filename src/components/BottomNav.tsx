import React, { useEffect, useRef, useState } from "react";
import { tr } from "../i18n/translations";

export type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "nfts"
  | "activity"
  | "swap"
  | "bridge"
  | "staking"
  | "settings";

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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const primaryItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: tr(lang, "nav_home"), icon: "⌂" },
    { id: "tokens", label: tr(lang, "nav_tokens"), icon: "◈" },
    { id: "activity", label: tr(lang, "nav_activity"), icon: "↻" },
    { id: "settings", label: tr(lang, "nav_settings"), icon: "⚙" },
  ];

  const secondaryItems: { id: Tab; label: string }[] = [
    { id: "send", label: tr(lang, "nav_send") },
    { id: "receive", label: tr(lang, "nav_receive") },
    { id: "swap", label: tr(lang, "nav_swap") },
    { id: "bridge", label: tr(lang, "nav_bridge") },
    { id: "staking", label: tr(lang, "nav_staking") },
    { id: "nfts", label: tr(lang, "nav_nfts") },
  ];

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: isLight ? "rgba(255,255,255,.98)" : "rgba(9,13,22,.98)",
        borderTop: `1px solid ${isLight ? "#dbe2f0" : "#1e2535"}`,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 8,
          alignItems: "stretch",
        }}
      >
        {primaryItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setMoreOpen(false);
                setTab(item.id);
              }}
              title={item.label}
              style={{
                padding: "9px 6px",
                borderRadius: 16,
                border: active
                  ? "1px solid #4d7ef2"
                  : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                background: active ? "#3f7cff" : isLight ? "#f8f9ff" : "#12182a",
                color: active ? "#ffffff" : isLight ? "#334155" : "#cfd6e4",
                fontWeight: 800,
                fontSize: 11,
                cursor: "pointer",
                minHeight: 54,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.label}</span>
            </button>
          );
        })}

        <div ref={moreRef} style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen((prev) => !prev);
            }}
            title="More"
            style={{
              width: "100%",
              padding: "9px 6px",
              borderRadius: 16,
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: moreOpen ? (isLight ? "#eef4ff" : "#162138") : isLight ? "#f8f9ff" : "#12182a",
              color: moreOpen ? "#3f7cff" : isLight ? "#334155" : "#cfd6e4",
              fontWeight: 800,
              fontSize: 11,
              cursor: "pointer",
              minHeight: 54,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>⋯</span>
            <span>More</span>
          </button>

          {moreOpen ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: "calc(100% + 10px)",
                width: 220,
                maxWidth: "min(220px, calc(100vw - 24px))",
                background: isLight ? "#ffffff" : "#0f1624",
                border: `1px solid ${isLight ? "#dbe2f0" : "#273042"}`,
                borderRadius: 18,
                boxShadow: isLight ? "0 18px 50px rgba(20,30,50,.15)" : "0 18px 50px rgba(0,0,0,.45)",
                padding: 8,
              }}
            >
              {secondaryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMoreOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 12px",
                    borderRadius: 12,
                    border: "none",
                    background: tab === item.id ? (isLight ? "#eef4ff" : "#162138") : "transparent",
                    color: tab === item.id ? "#3f7cff" : isLight ? "#10131a" : "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{ opacity: 0.6 }}>›</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
