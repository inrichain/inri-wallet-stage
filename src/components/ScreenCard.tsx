import React from "react";

export default function ScreenCard({
  theme = "dark",
  children,
  padding = 16,
  className = "",
  style,
}: {
  theme?: "dark" | "light";
  children: React.ReactNode;
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const isLight = theme === "light";
  return (
    <section
      className={`wallet-ui-card ${className}`.trim()}
      style={{
        background: isLight ? "#ffffff" : "#121621",
        borderColor: isLight ? "#dbe2f0" : "#252b39",
        padding,
        ...style,
      }}
    >
      {children}
    </section>
  );
}
