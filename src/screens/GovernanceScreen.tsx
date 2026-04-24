import React from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";

export default function GovernanceScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}><SectionTitle title="Governance" subtitle="Proposal list, voting power and execution hooks can be connected here later." theme={theme} /><div className="wallet-action-row"><StatusPill theme={theme} tone="primary">Module ready</StatusPill><StatusPill theme={theme}>Contracts later</StatusPill></div></ScreenCard>
    </div>
  );
}
