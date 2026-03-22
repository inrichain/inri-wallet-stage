import React from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";

export default function GovernanceScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Governance" subtitle="Structure the module now so proposals and voting contracts can drop in later without redesigning the wallet." theme={theme} actions={<StatusPill theme={theme} tone="primary">Module ready</StatusPill>} />
      </ScreenCard>
      <ScreenCard theme={theme}>
        <SectionTitle title="Live proposals" subtitle="No contract connected yet." theme={theme} compact />
        <EmptyState theme={theme} title="Governance shell ready" description="Later this screen can load proposal lists, voting power, results and proposal details without changing the wallet navigation again." />
      </ScreenCard>
    </div>
  );
}
