import React from "react";
import { tr } from "../i18n/translations";

export default function StakingScreen({
  theme = "dark",
  lang = "en",
}: {
  theme?: "dark" | "light";
  lang?: string;
}) {
  const isLight = theme === "light";

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
        <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>
          {tr(lang, "staking_title")}
        </h2>
        <div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3" }}>
          {tr(lang, "staking_subtitle")}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        <div style={cardStyle(isLight)}>
          <div style={titleStyle(isLight)}>{tr(lang, "staking_primary")}</div>
          <div style={descStyle(isLight)}>{tr(lang, "staking_primary_desc")}</div>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={titleStyle(isLight)}>{tr(lang, "staking_secondary")}</div>
          <div style={descStyle(isLight)}>{tr(lang, "staking_secondary_desc")}</div>
        </div>
      </div>

      <div style={noticeStyle(isLight)}>{tr(lang, "staking_coming")}</div>
    </div>
  );
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 18,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}

function titleStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#10131a" : "#ffffff",
    fontWeight: 800,
    fontSize: 18,
    marginBottom: 8,
  };
}

function descStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    lineHeight: 1.6,
  };
}

function noticeStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px dashed ${isLight ? "#cbd5e1" : "#334155"}`,
    borderRadius: 18,
    background: isLight ? "#f8fafc" : "#0b1120",
    padding: 16,
    color: isLight ? "#475569" : "#cbd5e1",
    textAlign: "center",
    fontWeight: 700,
  };
}
