import React from 'react';
import ScreenCard from '../components/ScreenCard';
import SectionTitle from '../components/SectionTitle';
import StatusPill from '../components/StatusPill';

export default function PoolScreen({ theme = 'dark' }: { theme?: 'dark' | 'light'; lang?: string }) {
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle
          title="Pool INRI"
          subtitle="Mining pool module ready. We can connect the real pool logic and stats next."
          theme={theme}
        />
        <div className="wallet-action-row">
          <StatusPill theme={theme} tone="primary">Pool module</StatusPill>
          <StatusPill theme={theme}>Ready for integration</StatusPill>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle
          title="What will go here"
          subtitle="The screen is already in the wallet so later we only need to plug in contracts, APIs and pool stats."
          theme={theme}
          compact
        />
        <div className="wallet-ui-subtle" style={{ display: 'grid', gap: 10 }}>
          <div>• Pool status and fee</div>
          <div>• Hashrate and active miners</div>
          <div>• Workers and rewards</div>
          <div>• Payouts and recent blocks</div>
          <div>• Miner setup and stratum connection info</div>
        </div>
      </ScreenCard>
    </div>
  );
}
