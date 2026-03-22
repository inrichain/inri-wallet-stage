import React from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";

export default function ClaimCenterScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title="Claim Center" subtitle="A single place for airdrops, incentives, rewards and future campaign claims." theme={theme} actions={<StatusPill theme={theme} tone="success">Ready</StatusPill>} />
      </ScreenCard>
      <ScreenCard theme={theme}>
        <SectionTitle title="Claims" subtitle="No active claim contracts connected yet." theme={theme} compact />
        <EmptyState theme={theme} title="Claim shell ready" description="This module can later show eligibility, claim buttons, history and contract-specific statuses without another reorganization." />
      </ScreenCard>
    </div>
  );
}
