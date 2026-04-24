import React from "react";

type Tone = "success" | "primary" | "warning" | "danger" | "neutral";

export default function StatusPill({
  children,
  tone = "neutral",
  theme = "dark",
}: {
  children: React.ReactNode;
  tone?: Tone;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const styles: Record<Tone, React.CSSProperties> = {
    success: { background: isLight ? "#eefaf1" : "rgba(74,222,128,.1)", color: isLight ? "#1e7d4b" : "#6ee7a6" },
    primary: { background: isLight ? "#eef4ff" : "rgba(63,124,255,.12)", color: "#6ea0ff" },
    warning: { background: isLight ? "#fff5e8" : "rgba(251,191,36,.12)", color: isLight ? "#9a5a00" : "#ffd179" },
    danger: { background: isLight ? "#fff0f0" : "rgba(255,123,123,.12)", color: "#ff7b7b" },
    neutral: { background: isLight ? "#eff3f8" : "rgba(148,163,184,.12)", color: isLight ? "#59657a" : "#9fb0cb" },
  };

  return <span className="wallet-status-pill" style={styles[tone]}>{children}</span>;
}
