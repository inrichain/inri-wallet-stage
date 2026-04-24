import React from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";

export default function ClaimCenterScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}><SectionTitle title="Claim Center" subtitle="Airdrops, rewards and campaign claims can plug in here later." theme={theme} /><div className="wallet-action-row"><StatusPill theme={theme} tone="primary">Ready shell</StatusPill><StatusPill theme={theme}>Claims next</StatusPill></div></ScreenCard>
    </div>
  );
}
