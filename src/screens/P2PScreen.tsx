import React from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import EmptyState from "../components/EmptyState";
import ActionButton from "../components/ActionButton";

export default function P2PScreen({ theme = "dark", setTab }: { theme?: "dark" | "light"; lang?: string; setTab?: (tab: any) => void; }) {
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle
          title="P2P"
          subtitle="Peer-to-peer trading area for INRI Wallet. We can connect your contract flow next."
          theme={theme}
        />
        <EmptyState
          theme={theme}
          title="P2P module ready for integration"
          description="The action entry is already in the wallet. Next we can connect your contract, address and execution flow."
          action={setTab ? <ActionButton theme={theme} onClick={() => setTab("dashboard")}>Back to Home</ActionButton> : undefined}
        />
      </ScreenCard>
    </div>
  );
}
